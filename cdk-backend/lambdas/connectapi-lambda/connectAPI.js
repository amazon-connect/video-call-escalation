// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const STSClient = require('aws-sdk/clients/sts');
const STS = new STSClient();
const ConnectClient = require('aws-sdk/clients/connect');

exports.ccpLogin = async (username) => {

    const instanceId = process.env.ConnectInstanceId

    const role_params = {
        RoleArn: process.env.RoleToAssume,
        RoleSessionName: username,
        DurationSeconds: 900
    }

    const stsResult = await STS.assumeRole(role_params).promise().catch(error => {
        console.error('CCPLogin >> STS: ', error);
        throw new ErrorHandler(500, 'CCP Login Error, please try again later');
    });

    const accessParams = {
        accessKeyId: stsResult.Credentials.AccessKeyId,
        secretAccessKey: stsResult.Credentials.SecretAccessKey,
        sessionToken: stsResult.Credentials.SessionToken
    }

    const Connect = new ConnectClient(accessParams);
    const connectParams = {
        InstanceId: instanceId
    };

    const connectResult = await Connect.getFederationToken(connectParams).promise().catch(error => {
        console.error('CCPLogin >> Connect: ', error);
        if(error.statusCode === 404)
        {
            throw new ErrorHandler(404, 'CCP Login Error, User not found');    
        }
        throw new ErrorHandler(500, 'CCP Login Error, please try again later');
    });

    const ccpLoginParams = {
        AccessToken : connectResult.Credentials.AccessToken,
        AccessTokenExpiration : new Date(connectResult.Credentials.AccessTokenExpiration).getTime(),
        RefreshToken : connectResult.Credentials.RefreshToken,
        RefreshTokenExpiration : new Date(connectResult.Credentials.RefreshTokenExpiration).getTime()
    }

    return ccpLoginParams;

}