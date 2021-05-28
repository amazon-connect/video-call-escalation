// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestAPI } from '@aws-amplify/api-rest';
import { Auth } from '@aws-amplify/auth';

export const startRecording = async (externalMeetingId, connectContactId, videoRecordingPlaybackURL) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('recordingAPI', '/recording', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            externalMeetingId,
            connectContactId,
            videoRecordingPlaybackURL
        }
    })
        .catch(error => {
            console.error('Start Recording >>', error.response);
            throw new Error(`${error.response.data.message}`);
        });
    return response.data;
}

export const stopRecording = async (externalMeetingId) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.del('recordingAPI', '/recording', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            externalMeetingId
        }
    })
        .catch(error => {
            console.error('Stop Recording >>', error.response);
            throw new Error(`${error.response.data.message}`);
        });

    return response.data;
}

export const getRecordingSummary = async (externalMeetingId) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.get('recordingAPI', `/recording-summary?externalMeetingId=${externalMeetingId}`, {
        headers: {
            cognitoIdToken: cid
        }
    })
        .catch(error => {
            console.error('Get Recording Summary >>', error.response);
            throw new Error(`${error.response.data.message}`);
        });

    return response.data;
}
