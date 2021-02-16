// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

//this module contains all DynamoDB operations
const DynamoDBClient = require("aws-sdk/clients/dynamodb");
var DynamoDB = new DynamoDBClient();


// Read resource names from the environment
const meetingsTableName = process.env.DDB_MEETINGS_TABLE;
const attendeesTableName = process.env.DDB_ATTENDEES_TABLE;

/**********************
* DynamoDB methods *
**********************/

const ddbTimeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45; //45 days

exports.getMeetingFromDDB = async (meetingTitle) => {
    const result = await DynamoDB.getItem({
        TableName: meetingsTableName,
        Key: {
            'Title': {
                S: meetingTitle
            }
        }
    }).promise();

    if (!result.Item) {
        return null;
    }

    const meetingItem = {
        Title : result.Item.Title.S,
        Data : JSON.parse(result.Item.Data.S),
        OwnerName: result.Item.OwnerName.S,
        OwnerUsername : result.Item.OwnerUsername.S,
        CreatedAt : result.Item.CreatedAt.S
    } 
    return meetingItem;

}

exports.putMeetingInDDB = async (title, ownerUsername, ownerName, meetingInfo) => {
    let createdAt = new Date().toISOString();
    await DynamoDB.putItem({
        TableName: meetingsTableName,
        Item: {
            'Title': { S: title },
            'OwnerUsername': { S: ownerUsername },
            'OwnerName': { S: ownerName },
            'CreatedAt': { S: createdAt },
            'Data': { S: JSON.stringify(meetingInfo) },
            'TTL': {
                N: '' + ddbTimeToLive
            }
        },
        ConditionExpression: 'attribute_not_exists(Title)'
    }).promise();
}

exports.updateMeetingEndedAtDDB = async (meetingTitle) =>{
    let endedAt = new Date().toISOString();
    await DynamoDB.updateItem({
        TableName: meetingsTableName,
        ExpressionAttributeNames: {
            "#endedAt" : "EndedAt"
        },
        ExpressionAttributeValues: {
            ":endedAt" : {S: endedAt}
        },
        Key:{
            "Title" : {S: meetingTitle}
        },
        UpdateExpression: "SET #endedAt = :endedAt"
    }).promise();
}

exports.getAttendeeNameFromDDB = async (meetingTitle, attendeeExternalUserId) => {
    const result = await DynamoDB.getItem({
        TableName: attendeesTableName,
        Key: {
            'AttendeeId': {
                S: `${meetingTitle}/${attendeeExternalUserId}`
            }
        }
    }).promise();

    if (!result.Item) {
        return 'Unknown'
    }

    return result.Item.Name.S;
}

exports.getAttendeeDataFromDDB = async (meetingTitle, attendeeExternalUserId) => {
    const result = await DynamoDB.getItem({
        TableName: attendeesTableName,
        Key: {
            'AttendeeId': {
                S: `${meetingTitle}/${attendeeExternalUserId}`
            }
        }
    }).promise();

    if (!result.Item) {
        return null
    }

    return JSON.parse(result.Item.Data.S)
}

exports.putAttendeeInDDB = async (meetingTitle, attendeeExternalUserId, attendeeName, attendeeInfo) => {
    await DynamoDB.putItem({
        TableName: attendeesTableName,
        Item: {
            'AttendeeId': {
                S: `${meetingTitle}/${attendeeExternalUserId}`
            },
            'Name': { S: attendeeName },
            'Data' : {S: JSON.stringify(attendeeInfo)},
            'TTL': {
                N: '' + ddbTimeToLive
            }
        }
    }).promise();
}