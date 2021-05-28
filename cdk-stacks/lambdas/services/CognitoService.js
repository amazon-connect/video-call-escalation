// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');

const CognitoClient = require('aws-sdk/clients/cognitoidentityserviceprovider');
const Cognito = new CognitoClient();

const cognitoUserPoolId = process.env.CognitoUserPoolId;

const updateUserAttributes = async (username, userAttributes) => {

    const params = {
        UserAttributes: [
            ...userAttributes
        ],
        UserPoolId: cognitoUserPoolId,
        Username: username
    }

    const cognitoResult = await Cognito.adminUpdateUserAttributes(params).promise().catch(error => {
        console.error('Cognito.adminUpdateUserAttributes: ', error);
        throw new ErrorHandler(500, 'Cognito Update User Attributes error, please try again later');
    });

    return cognitoResult;
}

module.exports = {
    updateUserAttributes
}