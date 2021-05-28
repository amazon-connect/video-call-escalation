// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestAPI } from '@aws-amplify/api-rest';
import { Auth } from '@aws-amplify/auth';

export const ccpLogin = async (connectLoginByEmail) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('connectAPI', '/ccplogin', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            "connectLoginByEmail": connectLoginByEmail
        }
    })
        .catch(error => {
            console.error('CCP Login >>', error.response);
            throw new Error(`CCP Login Error >> ${error.response.data.message}`);
        });
    return response.data;
}

export const setConnectUserId = async (connectLoginByEmail, connectUserId) => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.post('connectAPI', '/setConnectUserId', {
        headers: {
            cognitoIdToken: cid
        },
        body: {
            "connectLoginByEmail": connectLoginByEmail,
            connectUserId
        }
    })
        .catch(error => {
            console.error('SetConnectUserId Error >>', error.response);
            throw new Error(`SetConnectUserId Error >> ${error.response.data.message}`);
        });
    return response.data;
}

export const putConnectUserCache = async () => {
    //get current Cognito ID Token
    let cid = (await Auth.currentSession()).getIdToken().getJwtToken();
    const response = await RestAPI.put('connectAPI', '/connect-user-cache', {
        headers: {
            cognitoIdToken: cid
        }
    })
        .catch(error => {
            console.error('PutConnectUserCache Error >>', error.response);
            throw new Error(`PutConnectUserCache Error >> ${error.response.data.message}`);
        });
    return response.data;
}