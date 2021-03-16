// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DynamoDBClient = require("aws-sdk/clients/dynamodb");
var DynamoDB = new DynamoDBClient();

// Read resource names from the environment
const routesTableName = process.env.DDB_ROUTES_TABLE;

exports.putRouteInDDB = async (routeId, routeHash, ownerUsername, routeToAgentQueue, attendeeEmail, createdAt, ttlMinutes) => {

    const ddbTimeToLive = Math.floor(createdAt / 1000) + 60 * ttlMinutes
    let createdAtString = createdAt.toISOString();

    await DynamoDB.putItem({
        TableName: routesTableName,
        Item: {
            'RouteId': { N: '' + routeId },
            'RouteHash': { S: routeHash },
            'OwnerUsername': { S: ownerUsername },
            'CreatedAt': { S: createdAtString },
            'RouteToAgentQueue': { S: routeToAgentQueue },
            'AttendeeEmail': { S: attendeeEmail },
            'TTL': { N: '' + ddbTimeToLive }
        },
        ConditionExpression: 'attribute_not_exists(RouteId)'
    }).promise();
}