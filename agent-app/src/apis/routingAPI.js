// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestAPI } from '@aws-amplify/api-rest';
import { Auth } from '@aws-amplify/auth';

export const createAdHocRoute = async (attendeeEmail, routeToAgentQueue) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('routingAPI', '/adhoc', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            attendeeEmail,
            routeToAgentQueue
        }
    })
        .catch(error => {
            console.error('createAdHocRoute >>', error.response);
            throw new Error(`Create Ad-Hoc Route Error >> ${error.response.data.message}`);
        });
    return response.data;
}