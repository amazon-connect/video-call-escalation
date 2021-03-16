// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DynamoDBClient = require("aws-sdk/clients/dynamodb")
var DynamoDB = new DynamoDBClient()

// Read resource names from the environment
const routesTableName = process.env.DDB_ROUTES_TABLE;

exports.getRouteFromDDB = async(routeId) => {
    const result = await DynamoDB.getItem({
        TableName: routesTableName,
        Key: {
            'RouteId': {N: routeId}
        }
    }).promise()

    if(!result.Item){
        return null
    }

    const routeItem = {
        'RouteId': result.Item.RouteId.N,
        'RouteHash': result.Item.RouteHash.S,
        'OwnerUsername': result.Item.OwnerUsername.S ,
        'CreatedAt': result.Item.CreatedAt.S,
        'RouteToAgentQueue': result.Item.RouteToAgentQueue.S,
        'AttendeeEmail': result.Item.AttendeeEmail.S,
        'UsedAt': result.Item.UsedAt?.S,
        'TTL': result.Item.TTL.N
    }

    return routeItem
}

exports.updateRouteUsedAtDDB = async (routeId) =>{
    let usedAt = new Date().toISOString();
    await DynamoDB.updateItem({
        TableName: routesTableName,
        ExpressionAttributeNames: {
            "#usedAt" : "UsedAt"
        },
        ExpressionAttributeValues: {
            ":usedAt" : {S: usedAt}
        },
        Key:{
            "RouteId" : {N: routeId}
        },
        UpdateExpression: "SET #usedAt = :usedAt"
    }).promise();
}