// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DynamoDBClient = require("aws-sdk/clients/dynamodb");
const DynamoDB = new DynamoDBClient.DocumentClient();
const { ENTITIES } = require('./Constants');

const DDB_TABLE = process.env.DDB_TABLE;

const putRoute = async (route, ttlMinutes) => {
    const ddbTimeToLive = Math.floor(route.createdAt / 1000) + 60 * ttlMinutes
    let createdAtString = route.createdAt.toISOString();

    await DynamoDB.put({
        TableName: DDB_TABLE,
        Item: {
            PK: `${ENTITIES.Route.entityPrefix}${route.routeId}`,
            SK: `${ENTITIES.Route.entityPrefix}${route.routeId}`,
            entityType: ENTITIES.Route.entityType,
            [ENTITIES.Route.attributes.TTL]: ddbTimeToLive,
            ...route,
            [ENTITIES.Route.attributes.createdAt]: createdAtString
        },
        ConditionExpression: 'attribute_not_exists(PK)'
    }).promise();
}

const getRouteById = async (routeId) => {
    const result = await DynamoDB.get({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Route.entityPrefix}${routeId}`,
            SK: `${ENTITIES.Route.entityPrefix}${routeId}`,
        }
    }).promise();

    if (!result.Item) return null;
    return result.Item;
}

const setRouteUsedAt = async (routeId) => {
    let usedAt = new Date().toISOString();
    await DynamoDB.update({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Route.entityPrefix}${routeId}`,
            SK: `${ENTITIES.Route.entityPrefix}${routeId}`,
        },
        UpdateExpression: "SET #usedAt = :usedAt",
        ExpressionAttributeNames: {
            "#usedAt": ENTITIES.Route.attributes.usedAt
        },
        ExpressionAttributeValues: {
            ":usedAt": usedAt
        }
    }).promise();
}

module.exports = {
    putRoute,
    getRouteById,
    setRouteUsedAt
}