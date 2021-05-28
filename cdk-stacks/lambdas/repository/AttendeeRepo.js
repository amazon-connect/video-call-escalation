// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DynamoDBClient = require("aws-sdk/clients/dynamodb");
const DynamoDB = new DynamoDBClient.DocumentClient();
const { ENTITIES } = require('./Constants');

const DDB_TABLE = process.env.DDB_TABLE;
const ddbTimeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45; //45 days


const getAttendeeName = async (externalMeetingId, externalUserId) => {
    const result = await DynamoDB.get({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Attendee.entityPrefix}${externalUserId}`
        }
    }).promise();

    if (!result.Item?.attendeeName) {
        return 'Unknown';
    }

    return result.Item.attendeeName;
}

const getAttendeeJoinData = async (externalMeetingId, externalUserId) => {
    const resp = await DynamoDB.query({
        TableName: DDB_TABLE,
        KeyConditionExpression: '#PK = :PK and #SK between :attendee and :meeting',
        ExpressionAttributeNames: {
            '#PK': 'PK',
            '#SK': 'SK'
        },
        ExpressionAttributeValues: {
            ':PK': `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            ':meeting': `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            ':attendee': `${ENTITIES.Attendee.entityPrefix}${externalUserId}`
        },
        ScanIndexForward: true
    }).promise();

    const meeting = resp.Items.find((i) => i.SK === `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`);
    const attendee = resp.Items.find((i) => i.SK === `${ENTITIES.Attendee.entityPrefix}${externalUserId}`);

    return {
        chimeMeetingData: meeting.chimeMeetingData,
        chimeAttendeeData: attendee.chimeAttendeeData
    }
}

const putAttendee = async (externalMeetingId, attendee) => {
    const createdAt = new Date().toISOString();
    await DynamoDB.put({
        TableName: DDB_TABLE,
        Item: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Attendee.entityPrefix}${attendee.externalUserId}`,
            entityType: ENTITIES.Attendee.entityType,
            [ENTITIES.Attendee.attributes.createdAt]: createdAt,
            [ENTITIES.Attendee.attributes.TTL]: ddbTimeToLive,
            ...attendee
        }
    }).promise();
}

const getAttendeeByExternalUserId = async (externalMeetingId, externalUserId) => {
    const result = await DynamoDB.get({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Attendee.entityPrefix}${externalUserId}`
        }
    }).promise();

    if (!result.Item) return null;
    return result.Item;
}

module.exports = {
    getAttendeeName,
    getAttendeeJoinData,
    putAttendee,
    getAttendeeByExternalUserId
}
