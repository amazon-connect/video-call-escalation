// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestAPI } from '@aws-amplify/api-rest';
import { Auth } from '@aws-amplify/auth';

export const createMeeting = async (externalMeetingId, meetingTitle, meetingRegion, meetingAttendees) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('chimeAPI', '/meeting', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            externalMeetingId,
            meetingTitle,
            meetingRegion,
            meetingAttendees
        }
    })
        .catch(error => {
            console.error('Create Meeting >>', error.response);
            throw new Error(`Create Meeting  Error >> ${error.response.data.message}`);
        });
    return response.data;
}

export const endMeeting = async (externalMeetingId) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.del('chimeAPI', '/meeting', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            externalMeetingId
        }
    })
        .catch(error => {
            console.error('End Meeting >>', error.response);
            throw new Error(`End Meeting  Error >> ${error.response.data.message}`);
        });
    return response.data;
}

export const getAttendeeNameCallback = (externalMeetingId) => {
    return async (chimeAttendeeId, externalUserId) => {
        const response = await RestAPI.get('chimeAPI', `/attendee-name?externalMeetingId=${externalMeetingId}&attendeeExternalUserId=${externalUserId}`)
            .catch(error => {
                console.error('Get Attendee Name >> ', error.response);
                throw new Error(`Get Attendee Name Error >> ${error.response.data.message}`);
            });
        return { name: response.data }
    }
}

export const createAttendee = async (externalMeetingId, attendeeExternalUserId, attendeeName, attendeeEmail) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('chimeAPI', '/attendee', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            externalMeetingId,
            attendeeExternalUserId,
            attendeeName,
            attendeeEmail
        }
    })
        .catch(error => {
            console.error('Create Attendee >>', error.response);
            throw new Error(`Create Attendee  Error >> ${error.response.data.message}`);
        });
    return response.data;
}