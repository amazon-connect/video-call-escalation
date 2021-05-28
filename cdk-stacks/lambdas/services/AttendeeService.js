// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');
const AttendeeRepo = require('../repository/AttendeeRepo');
const MeetingRepo = require('../repository/MeetingRepo');
const ChimeClient = require("aws-sdk/clients/chime");
const Chime = new ChimeClient({ region: process.env.CHIME_REGION ? process.env.CHIME_REGION : 'us-east-1' });


const getAttendeeName = async (externalMeetingId, attendeeExternalUserId) => {
    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide Attendee External User Id');

    const attendeeName = await AttendeeRepo.getAttendeeName(externalMeetingId, attendeeExternalUserId).catch(error => {
        console.error('getAttendeeName: ', error);
        throw new ErrorHandler(500, 'Get Attendee Error, please try again later');
    });

    if (!attendeeName) throw new ErrorHandler(404, 'Attendee not found');

    return attendeeName;
}

const createAttendee = async (externalMeetingId, meetingOwnerUsername, attendeeExternalUserId, attendeeName, attendeeEmail) => {

    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide Attendee External User Id');
    if (!attendeeName) throw new ErrorHandler(400, 'Must provide attendee name');

    //first, have to find that meeting and check the owner
    const meetingItem = await MeetingRepo.getMeetingByExternalMeetingId(externalMeetingId).catch(error => {
        console.error('getMeetingByExternalMeetingId: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    });

    if (!meetingItem) throw new ErrorHandler(404, 'Create Attendee Error, meeting not found');
    if (meetingItem.ownerUsername !== meetingOwnerUsername) throw new ErrorHandler(400, 'Create Attendee Error, user is not the owner');

    const attendee = {
        externalUserId: attendeeExternalUserId,
        attendeeName,
        attendeeEmail
    }

    //then add attendee
    const attendeeInfo = (await Chime.createAttendee({
        MeetingId: meetingItem.chimeMeetingId,
        ExternalUserId: attendeeExternalUserId
    }).promise().catch(error => {
        console.error('Chime.createAttendee: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    }));

    await AttendeeRepo.putAttendee(externalMeetingId, {
        ...attendee,
        chimeAttendeeId: attendeeInfo.Attendee.AttendeeId,
        chimeAttendeeData: attendeeInfo.Attendee
    }).catch(error => {
        console.error('putAttendee: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    });

    return attendeeInfo.Attendee;
}

const getAttendeeJoinData = async (externalMeetingId, attendeeExternalUserId) => {
    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide Attendee External User Id');

    //first, have to find that attendee
    const attendeeJoinData = await AttendeeRepo.getAttendeeJoinData(externalMeetingId, attendeeExternalUserId).catch(error => {
        console.error('getAttendeeJoinData: ', error);
        throw new ErrorHandler(500, 'Join Meeting Error, please try again later');
    });

    if (!attendeeJoinData?.chimeMeetingData || !attendeeJoinData.chimeAttendeeData) throw new ErrorHandler(403, 'Attendee Access Denied');

    const joinInfo = {
        JoinInfo: {
            Attendee: attendeeJoinData.chimeAttendeeData,
            Meeting: attendeeJoinData.chimeMeetingData
        }
    };

    return joinInfo;
}

const deleteAttendee = async (externalMeetingId, meetingOwnerUsername, attendeeExternalUserId) => {
    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide Attendee External User Id');

    //first, have to find that meeting and check the owner
    const meetingItem = await MeetingRepo.getMeetingByExternalMeetingId(externalMeetingId).catch(error => {
        console.error('getMeetingByExternalMeetingId: ', error);
        throw new ErrorHandler(500, 'Delete Attendee Error, please try again later');
    });

    if (!meetingItem) throw new ErrorHandler(404, 'Delete Attendee Error, meeting not found');
    if (meetingItem.ownerUsername !== meetingOwnerUsername) throw new ErrorHandler(400, 'Delete Attendee Error, user is not the owner');

    //get the attendee
    const attendeeItem = await AttendeeRepo.getAttendeeByExternalUserId(externalMeetingId, attendeeExternalUserId).catch(error => {
        console.error('getAttendeeByExternalUserId: ', error);
        throw new ErrorHandler(500, 'Delete Attendee Error, please try again later');
    });

    if (!attendeeItem.chimeAttendeeId) throw new ErrorHandler(404, 'Attendee not found');

    const deleteInfo = await Chime.deleteAttendee({
        MeetingId: meetingItem.chimeMeetingId,
        AttendeeId: attendeeItem.chimeAttendeeId
    }).promise().catch(error => {
        console.error('Chime.deleteAttendee: ', error);
        throw new ErrorHandler(500, 'Delete Attendee Error, please try again later');
    });

    return deleteInfo;
}

module.exports = {
    getAttendeeName,
    createAttendee,
    getAttendeeJoinData,
    deleteAttendee
}