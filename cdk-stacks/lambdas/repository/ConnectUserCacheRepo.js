// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DynamoDBClient = require("aws-sdk/clients/dynamodb");
const DynamoDB = new DynamoDBClient.DocumentClient();
const { ENTITIES } = require('./Constants');

const DDB_TABLE = process.env.DDB_TABLE;
const ddbTimeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 12; //12 hours

const putConnectUserCache = async (connectUserId, dataToCache) => {
    const createdAt = new Date().toISOString();

    await DynamoDB.put({
        TableName: DDB_TABLE,
        Item: {
            PK: `${ENTITIES.ConnectUserCache.entityPrefix}${connectUserId}`,
            SK: `${ENTITIES.ConnectUserCache.entityPrefix}${connectUserId}`,
            entityType: ENTITIES.ConnectUserCache.entityType,
            ...dataToCache,
            [ENTITIES.ConnectUserCache.attributes.createdAt]: createdAt,
            [ENTITIES.ConnectUserCache.attributes.TTL]: ddbTimeToLive,
        }
    }).promise();
}

const getConnectUserCache = async (connectUserId) => {
    const result = await DynamoDB.get({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.ConnectUserCache.entityPrefix}${connectUserId}`,
            SK: `${ENTITIES.ConnectUserCache.entityPrefix}${connectUserId}`,
        }
    }).promise();

    if (!result.Item) return null;
    return result.Item;
}

module.exports = {
    putConnectUserCache,
    getConnectUserCache
}