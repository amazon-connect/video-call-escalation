// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const persistance = require('./persistance');
const ErrorHandler = require('./error');

const ChimeClient = require("aws-sdk/clients/chime");
const Chime = new ChimeClient({ region: process.env.CHIME_REGION ? process.env.CHIME_REGION : 'us-east-1' });


/**********************
* Meeting methods *
**********************/


exports.createMeeting = async (meetingTitle, meetingRegion, meetingOwnerUsername, attendeeName, attendeeExternalUserId) => {

    if (!meetingTitle) throw new ErrorHandler(400, 'Must provide meeting title');
    if (meetingTitle.length < 2 || meetingTitle.length > 64) throw new ErrorHandler(400, 'Meeting title: Minimum length of 2. Maximum length of 64');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');
    if (!attendeeName) throw new ErrorHandler(400, 'Must provide attendee name');


    let meetingInfo = await persistance.getMeetingFromDDB(meetingTitle).catch(error => {
        console.error('getMeetingFromDDB: ', error);
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    });
    if (meetingInfo) throw new ErrorHandler(409, 'Meeting title already exists');

    const request = {
        ExternalMeetingId: meetingTitle,
        ClientRequestToken: uuid(),
        MediaRegion: meetingRegion || 'us-east-1'
    };
    console.info('Creating new meeting: ', request);
    meetingInfo = await Chime.createMeeting(request).promise().catch(error => {
        console.error('Chime.createMeeting: ', error);
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    });
    await persistance.putMeetingInDDB(meetingTitle, meetingOwnerUsername, attendeeName, meetingInfo).catch(error => {
        console.error('putMeetingInDDB: ', error);
        throw new ErrorHandler(500, 'Create Meeting Error, please try again later');
    });

    //add attendee to the newly created meeting
    const attendeeInfo = (await Chime.createAttendee({
        MeetingId: meetingInfo.Meeting.MeetingId,
        ExternalUserId: attendeeExternalUserId || uuid()
    }).promise().catch(error => {
        console.error('Chime.createAttendee: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    }));

    await persistance.putAttendeeInDDB(meetingTitle, attendeeInfo.Attendee.ExternalUserId, attendeeName, attendeeInfo).catch(error => {
        console.error('putAttendeeInDDB: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    });

    const joinInfo = {
        JoinInfo: {
            Title: meetingTitle,
            Meeting: meetingInfo.Meeting,
            Attendee: attendeeInfo.Attendee
        }
    };

    return joinInfo;
}

exports.endMeetingForAll = async (meetingTitle, meetingOwnerUsername) => {

    if (!meetingTitle) throw new ErrorHandler(400, 'Must provide meeting title');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');

    const meetingItem = await persistance.getMeetingFromDDB(meetingTitle).catch(error => {
        console.error('getMeetingFromDDB: ', error);
        throw new ErrorHandler(500, 'End Meeting Error, please try again later');
    });

    if(!meetingItem) throw new ErrorHandler(404, 'End Meeting Error, meeting not found');
    if(meetingItem.OwnerUsername !== meetingOwnerUsername) throw new ErrorHandler(400, 'End Meeting Error, user is not the owner');

    const deleteInfo = await Chime.deleteMeeting({
        MeetingId: meetingItem.Data.Meeting.MeetingId
    }).promise().catch(error => {
        console.error('Chime.deleteMeeting: ', error);
        throw new ErrorHandler(500, 'End Meeting Error, please try again later');
    });

    await persistance.updateMeetingEndedAtDDB(meetingTitle).catch(error => {
        console.error('updateMeetingEndedAtDDB: ', error);
    });

    return deleteInfo;
}

/**********************
* Attendee methods *
**********************/

exports.getAttendeeName = async (meetingTitle, attendeeExternalUserId) => {
    if (!meetingTitle) throw new ErrorHandler(400, 'Must provide meeting title');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide attendeeExternalUserId');

    const attendeeItem = await persistance.getAttendeeNameFromDDB(meetingTitle, attendeeExternalUserId).catch(error => {
        console.error('getAttendeeNameFromDDB: ', error);
        throw new ErrorHandler(500, 'Get Attendee Error, please try again later');
    });

    if(!attendeeItem) throw new ErrorHandler(404, 'Attendee not found');

    return attendeeItem;
}

exports.createAttendee = async (meetingTitle, meetingOwnerUsername, attendeeExternalUserId, attendeeName) => {

    if (!meetingTitle) throw new ErrorHandler(400, 'Must provide meeting title');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide attendeeExternalUserId');
    if (!attendeeName) throw new ErrorHandler(400, 'Must provide attendee name');

    //first, have to find that meeting and check the owner
    const meetingItem = await persistance.getMeetingFromDDB(meetingTitle).catch(error => {
        console.error('getMeetingFromDDB: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    });

    if(!meetingItem) throw new ErrorHandler(404, 'Create Attendee Error, meeting not found');
    if(meetingItem.OwnerUsername !== meetingOwnerUsername) throw new ErrorHandler(400, 'Create Attendee Error, user is not the owner');

    //then add attendee
    const attendeeInfo = (await Chime.createAttendee({
        MeetingId: meetingItem.Data.Meeting.MeetingId,
        ExternalUserId: attendeeExternalUserId
    }).promise().catch(error => {
        console.error('Chime.createAttendee: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    }));

    await persistance.putAttendeeInDDB(meetingTitle, attendeeExternalUserId, attendeeName, attendeeInfo).catch(error => {
        console.error('putAttendeeInDDB: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    });

    return attendeeInfo;
}


/**********************
* Join Meeting method *
**********************/

exports.joinMeeting = async (meetingTitle, attendeeExternalUserId) => {
    if (!meetingTitle) throw new ErrorHandler(400, 'Must provide meeting title');
    if (!attendeeExternalUserId) throw new ErrorHandler(400, 'Must provide attendeeExternalUserId');

    //first, have to find that attendee
    const attendeeData = await persistance.getAttendeeDataFromDDB(meetingTitle, attendeeExternalUserId).catch(error => {
        console.error('getAttendeeDataFromDDB: ', error);
        throw new ErrorHandler(500, 'Join Meeting Error, please try again later');
    });

    if(!attendeeData) throw new ErrorHandler(403, 'Attendee Access Denied');

    //then, find that meeting
    const meetingItem = await persistance.getMeetingFromDDB(meetingTitle).catch(error => {
        console.error('getMeetingFromDDB: ', error);
        throw new ErrorHandler(500, 'End Meeting Error, please try again later');
    });

    if(!meetingItem) throw new ErrorHandler(403, 'Meeting Access Denied');

    const joinInfo = {
        JoinInfo: {
            Title: meetingTitle,
            Attendee: attendeeData,
            Meeting: meetingItem.Data
        }
    };

    return joinInfo; 
}

/**********************
* Helper methods *
**********************/

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}