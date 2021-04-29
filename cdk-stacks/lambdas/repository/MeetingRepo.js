// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DynamoDBClient = require("aws-sdk/clients/dynamodb");
const DynamoDB = new DynamoDBClient.DocumentClient();
const { ENTITIES } = require('./Constants');

const DDB_TABLE = process.env.DDB_TABLE;
const ddbTimeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45; //45 days


const getMeetingByExternalMeetingId = async (externalMeetingId) => {
    const result = await DynamoDB.get({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`
        }
    }).promise();

    if (!result.Item) return null;
    return result.Item;
}

const putMeeting = async (meeting, attendees = []) => {
    const createdAt = new Date().toISOString();
    await DynamoDB.transactWrite({
        TransactItems: [
            {
                Put: {
                    TableName: DDB_TABLE,
                    Item: {
                        PK: `${ENTITIES.Meeting.entityPrefix}${meeting.externalMeetingId}`,
                        SK: `${ENTITIES.Meeting.entityPrefix}${meeting.externalMeetingId}`,
                        entityType: ENTITIES.Meeting.entityType,
                        [ENTITIES.Meeting.attributes.createdAt]: createdAt,
                        [ENTITIES.Meeting.attributes.TTL]: ddbTimeToLive,
                        ...meeting
                    },
                    ConditionExpression: 'attribute_not_exists(PK)'
                },
            },
            ...attendees.map((attendee) => ({
                Put: {
                    TableName: DDB_TABLE,
                    Item: {
                        PK: `${ENTITIES.Meeting.entityPrefix}${meeting.externalMeetingId}`,
                        SK: `${ENTITIES.Attendee.entityPrefix}${attendee.externalUserId}`,
                        entityType: ENTITIES.Attendee.entityType,
                        [ENTITIES.Attendee.attributes.createdAt]: createdAt,
                        [ENTITIES.Attendee.attributes.TTL]: ddbTimeToLive,
                        ...attendee,
                    }
                }
            }))
        ]
    }).promise();
}

const setMeetingEndedAt = async (externalMeetingId) => {
    const endedAt = new Date().toISOString();
    await DynamoDB.update({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`
        },
        UpdateExpression: "SET #endedAt = :endedAt",
        ExpressionAttributeNames: {
            "#endedAt": ENTITIES.Meeting.attributes.endedAt
        },
        ExpressionAttributeValues: {
            ":endedAt": endedAt
        }
    }).promise();
}


module.exports = {
    getMeetingByExternalMeetingId,
    putMeeting,
    setMeetingEndedAt
}