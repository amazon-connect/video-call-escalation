// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestAPI } from '@aws-amplify/api-rest';
import { Auth } from '@aws-amplify/auth';

export const createMeeting = async (meetingTitle, meetingRegion, attendeeName) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('videoCallEscalationChimeAPI', '/meeting', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            meetingTitle : meetingTitle,
            meetingRegion : meetingRegion,
            attendeeName : attendeeName
        }
    })
    .catch(error => {
        console.error('Create Meeting >>', error.response);
        throw new Error(`Create Meeting  Error >> ${error.response.data.message}`);
    });
    return response.data;
}

export const endMeeting = async (meetingTitle) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.del('videoCallEscalationChimeAPI', '/meeting', {
        headers: {
            cognitoIdToken: cid
        },
        body:{
            meetingTitle : meetingTitle
        }
    })
    .catch(error => {
        console.error('End Meeting >>', error.response);
        throw new Error(`End Meeting  Error >> ${error.response.data.message}`);
    });
    return response.data;
}

export const createGetAttendeeCallback = (meetingTitle) => {
    return async (chimeAttendeeId, externalUserId) => {
        const response = await RestAPI.get('videoCallEscalationChimeAPI', `/attendee?meetingTitle=${meetingTitle}&attendeeExternalUserId=${externalUserId}`)
        .catch(error => {
            console.error('Get Attendee >> ', error.response);
            throw new Error (`Get Attendee Error >> ${error.response.data.message}`);
        });
        return {name: response.data}
    }
}

export const createAttendee = async (meetingTitle, attendeeExternalUserId, attendeeName) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('videoCallEscalationChimeAPI', '/attendee', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            meetingTitle : meetingTitle,
            attendeeExternalUserId : attendeeExternalUserId,
            attendeeName : attendeeName
        }
    })
    .catch(error => {
        console.error('Create Attendee >>', error.response);
        throw new Error(`Create Attendee  Error >> ${error.response.data.message}`);
    });
    return response.data;
}