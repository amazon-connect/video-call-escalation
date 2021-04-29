// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');
const MeetingRepo = require('../repository/MeetingRepo');
const CommonUtility = require('../lib/CommonUtility');
const ChimeClient = require("aws-sdk/clients/chime");
const Chime = new ChimeClient({ region: process.env.CHIME_REGION ? process.env.CHIME_REGION : 'us-east-1' });


const createMeeting = async (externalMeetingId, meetingTitle, meetingRegion, meetingOwnerUsername, meetingOwnerEmail, meetingAttendees = []) => {

    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (externalMeetingId.length < 2 || externalMeetingId.length > 64) throw new ErrorHandler(400, 'External Meeting Id: Minimum length of 2. Maximum length of 64');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');

    const meetingItem = await MeetingRepo.getMeetingByExternalMeetingId(externalMeetingId).catch(error => {
        console.error('getMeetingByExternalMeetingId: ', error);
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    });
    if (meetingItem) throw new ErrorHandler(409, 'Meeting title already exists');

    const ownerAttendee = meetingAttendees.find((i) => i.isOwner === true);
    if (!ownerAttendee) throw new ErrorHandler(400, 'Must provide at least meeting owner attendee');
    if (meetingAttendees.find((i) => !i.attendeeName)) throw new ErrorHandler(400, 'Must provide attendee name for all attendees');

    ownerAttendee.externalUserId = ownerAttendee.externalUserId ?? CommonUtility.uuid();
    ownerAttendee.attendeeEmail = meetingOwnerEmail;

    console.info(`ownerAttendee: `, ownerAttendee);

    const otherAttendees = meetingAttendees.filter((i) => !i.isOwner);
    console.info(`otherAttendees: `, otherAttendees);

    //create meeting and add attendee to the newly created meeting

    const request = {
        ExternalMeetingId: externalMeetingId,
        ClientRequestToken: CommonUtility.uuid(),
        MediaRegion: meetingRegion || 'us-east-1',
        Attendees: [
            {
                ExternalUserId: ownerAttendee.externalUserId
            },
            ...otherAttendees.map((attendee) => ({
                ExternalUserId: attendee.externalUserId
            }))
        ]
    };
    console.info('Creating new meeting: ', request);
    const meetingInfo = await Chime.createMeetingWithAttendees(request).promise().catch(error => {
        console.error('Chime.createMeeting: ', error);
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    });
    if (meetingInfo.Errors?.length > 0) {
        console.error('Chime.createMeeting - Failed to create attendee: ', meetingInfo)
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    }

    const chimeOwnerAttendeeData = meetingInfo.Attendees.find((i) => i.ExternalUserId === ownerAttendee.externalUserId);
    const chimeOwnerAttendee = {
        ...ownerAttendee,
        chimeAttendeeId: chimeOwnerAttendeeData.AttendeeId,
        chimeAttendeeData: chimeOwnerAttendeeData,
    }

    console.info(`chimeOwnerAttendee: `, chimeOwnerAttendee);

    const chimeOtherAttendees = [
        ...otherAttendees.map((attendee) => {
            const chimeAttendeeData = meetingInfo.Attendees.find((i) => i.ExternalUserId === attendee.externalUserId);
            return {
                ...attendee,
                chimeAttendeeId: chimeAttendeeData.AttendeeId,
                chimeAttendeeData: chimeAttendeeData,
                isOwner: false
            }
        })
    ]
    console.info(`chimeOtherAttendees: `, chimeOtherAttendees);

    await MeetingRepo.putMeeting({
        externalMeetingId,
        meetingTitle,
        ownerUsername: meetingOwnerUsername,
        ownerName: ownerAttendee.attendeeName,
        ownerEmail: meetingOwnerEmail,
        chimeMeetingId: meetingInfo.Meeting.MeetingId,
        chimeMeetingData: meetingInfo.Meeting
    }, [chimeOwnerAttendee, ...chimeOtherAttendees]).catch(error => {
        console.error('putMeetingInDDB: ', error);
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    });

    const joinInfo = {
        JoinInfo: {
            Meeting: meetingInfo.Meeting,
            Attendee: chimeOwnerAttendee.chimeAttendeeData
        }
    };

    return joinInfo;
}

const endMeetingForAll = async (externalMeetingId, meetingOwnerUsername) => {

    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');

    const meetingItem = await MeetingRepo.getMeetingByExternalMeetingId(externalMeetingId).catch(error => {
        console.error('getMeetingByExternalMeetingId: ', error);
        throw new ErrorHandler(500, 'End Meeting Error, please try again later');
    });

    if (!meetingItem) throw new ErrorHandler(404, 'End Meeting Error, meeting not found');
    if (meetingItem.ownerUsername !== meetingOwnerUsername) throw new ErrorHandler(400, 'End Meeting Error, user is not the owner');

    const deleteInfo = await Chime.deleteMeeting({
        MeetingId: meetingItem.chimeMeetingId
    }).promise().catch(error => {
        console.error('Chime.deleteMeeting: ', error);
        throw new ErrorHandler(500, 'End Meeting Error, please try again later');
    });

    await MeetingRepo.setMeetingEndedAt(externalMeetingId).catch(error => {
        console.error('setMeetingEndedAt: ', error);
    });

    return deleteInfo;
}

module.exports = {
    createMeeting,
    endMeetingForAll
}