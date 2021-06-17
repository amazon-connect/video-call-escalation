// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('../lib/Error');
const STSClient = require('aws-sdk/clients/sts');
const STS = new STSClient();
const ConnectClient = require('aws-sdk/clients/connect');
const CognitoService = require('./CognitoService');
const ConnectUserCacheRepo = require('../repository/ConnectUserCacheRepo');

const instanceId = process.env.ConnectInstanceId

const ccpLogin = async (username) => {

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
        if (error.statusCode === 404) {
            throw new ErrorHandler(404, 'CCP Login Error, User not found');
        }
        throw new ErrorHandler(500, 'CCP Login Error, please try again later');
    });

    const ccpLoginParams = {
        AccessToken: connectResult.Credentials.AccessToken,
        AccessTokenExpiration: new Date(connectResult.Credentials.AccessTokenExpiration).getTime(),
        RefreshToken: connectResult.Credentials.RefreshToken,
        RefreshTokenExpiration: new Date(connectResult.Credentials.RefreshTokenExpiration).getTime()
    }

    return ccpLoginParams;

}

const describeUser = async (connectUserId) => {
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');

    const Connect = new ConnectClient();
    const connectParams = {
        InstanceId: instanceId,
        UserId: connectUserId
    }

    const describeUserResult = await Connect.describeUser(connectParams).promise().catch(error => {
        console.error('Connect.describeUser: ', error);
        throw new ErrorHandler(500, 'Connect Describe User Error, please try again later');
    });

    return describeUserResult
}

const describeUserHierarchyGroup = async (hierarchyGroupId) => {
    if (!hierarchyGroupId) throw new ErrorHandler(400, 'Must provide hierarchyGroupId');

    const Connect = new ConnectClient();
    const connectParams = {
        InstanceId: instanceId,
        HierarchyGroupId: hierarchyGroupId
    }

    const describeUserHierarchyGroupResult = await Connect.describeUserHierarchyGroup(connectParams).promise().catch(error => {
        console.error('Connect.describeUserHierarchyGroup: ', error);
        throw new ErrorHandler(500, 'Connect Describe User Hierarchy Group Error, please try again later');
    });

    return describeUserHierarchyGroupResult;

}

const setConnectUserId = async (connectUsername, connectUserId, cognitoUsername) => {

    if (!connectUsername) throw new ErrorHandler(400, 'Must provide connectUsername');
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');
    if (!cognitoUsername) throw new ErrorHandler(400, 'Must provide cognitoUsername');

    const describeUserResult = await describeUser(connectUserId);

    if (describeUserResult?.User.Username !== connectUsername) {
        console.error(`No-Match: Provided Username: ${connectUsername} vs Retrieved Username: ${describeUserResult?.User.Username}`);
        throw new ErrorHandler(400, `Invalid connectUserId: ${connectUserId}`);
    }

    const connectUserIdAttribute = {
        Name: 'custom:connectUserId',
        Value: connectUserId
    }

    await CognitoService.updateUserAttributes(cognitoUsername, [connectUserIdAttribute]).catch(error => {
        console.error('CognitoService.updateUserAttributes: ', error);
        throw new ErrorHandler(500, 'Set Connect UserId Error, please try again later');
    });

    return { connectUserId };
}

const getConnectUserCache = async (connectUserId) => {
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');

    const connectUserCacheItem = await ConnectUserCacheRepo.getConnectUserCache(connectUserId).catch(error => {
        console.error('ConnectUserCacheRepo.getConnectUserCache: ', error);
        throw new ErrorHandler(500, 'Get Connect User Cache Error, please try again later');
    });

    //check if expired
    const currentTime = Math.floor((new Date()).valueOf() / 1000);
    if (!connectUserCacheItem || connectUserCacheItem?.TTL < currentTime) {
        console.info(`Connect User Cache not found or has expired. Please login again.`);
        throw new ErrorHandler(500, 'Connect User Cache not found or has expired. Please login again.');
    }

    return connectUserCacheItem;
}

const putConnectUserCache = async (connectUserId) => {
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');

    const connectUserCacheItem = await getConnectUserCache(connectUserId).catch(error => {
        console.warn(`getConnectUserCache: `, error);
        return null;
    });

    if (connectUserCacheItem?.createdAt) {
        const createdAtDate = new Date(connectUserCacheItem.createdAt);
        const now = new Date();
        const diffMs = Math.abs(now - createdAtDate);
        const diffMinutes = Math.floor((diffMs / 1000) / 60);
        console.info(`ConnectUserCache is  ${diffMinutes} minute(s) old, refresh only if older than 5 minutes`);
        if (diffMinutes <= 5) {
            return false;
        }
    }

    const describeUserResult = await describeUser(connectUserId).catch(error => {
        console.error('Connect.describeUser: ', error);
        throw new ErrorHandler(500, 'Put Connect User Cache Error, please try again later');
    });

    let hierarchyGroupSummary = null;

    if (describeUserResult.User.HierarchyGroupId) {
        const describeUserHierarchyGroupResult = await describeUserHierarchyGroup(describeUserResult.User.HierarchyGroupId).catch(error => {
            console.error('Connect.describeUserHierarchyGroup: ', error);
            throw new ErrorHandler(500, 'Put Connect User Cache Error, please try again later');
        });
        hierarchyGroupSummary = describeUserHierarchyGroupResult?.HierarchyGroup
    }

    const dataToCache = {
        connectUserId: describeUserResult.User.Id,
        hierarchyGroupId: describeUserResult.User.HierarchyGroupId,
        hierarchyGroupSummary,
        securityProfileIds: describeUserResult.User.SecurityProfileIds
    }

    await ConnectUserCacheRepo.putConnectUserCache(connectUserId, dataToCache).catch(error => {
        console.error('ConnectUserCacheRepo.putConnectUserCache: ', error);
        throw new ErrorHandler(500, 'Put Connect User Cache Error, please try again later');
    });
    return true;
}

const getUserHierarchyGroup = async (connectUserId) => {
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');

    const connectUserCacheItem = await getConnectUserCache(connectUserId).catch(error => {
        console.error('GetConnectUserCache: ', error);
        throw new ErrorHandler(500, 'Get Connect User Cache Error, please try again later');
    });

    if (!connectUserCacheItem) {
        console.error('Connect User Cache Item not found: ', connectUserCacheItem);
        throw new ErrorHandler(500, 'Get Connect User Cache Error, please try again later');
    }

    return {
        hierarchyGroupId: connectUserCacheItem.hierarchyGroupId,
        hierarchyGroupSummary: connectUserCacheItem.hierarchyGroupSummary
    }
}

const updateContactAttributes = async (initialContactId, attributes) => {
    if (!initialContactId) throw new ErrorHandler(400, 'Must provide initialContactId');
    if (!attributes) throw new ErrorHandler(400, 'Must provide attributes');

    const Connect = new ConnectClient();
    const connectParams = {
        InstanceId: instanceId,
        InitialContactId: initialContactId,
        Attributes: attributes
    }

    const updateContactAttributesResult = await Connect.updateContactAttributes(connectParams).promise().catch(error => {
        console.error('Connect.updateContactAttributes: ', error);
        throw new ErrorHandler(500, 'Connect Update Contact Attributes Error, please try again later');
    });

    return updateContactAttributesResult;
}

module.exports = {
    ccpLogin,
    setConnectUserId,
    putConnectUserCache,
    getConnectUserCache,
    getUserHierarchyGroup,
    updateContactAttributes
}