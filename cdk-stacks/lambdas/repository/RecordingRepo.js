// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { ENTITIES } = require('./Constants');
const DynamoDBClient = require("aws-sdk/clients/dynamodb");

const DynamoDBClientParams = {}
if (process.env.DDB_REGION) {
    DynamoDBClientParams.region = process.env.DDB_REGION
}
const DynamoDB = new DynamoDBClient.DocumentClient(DynamoDBClientParams);

const DDB_TABLE = process.env.DDB_TABLE;
const ddbTimeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45; //45 days

const putRecording = async (externalMeetingId, recording) => {
    let createdAtString = recording.createdAt.toISOString();
    await DynamoDB.put({
        TableName: DDB_TABLE,
        Item: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Recording.entityPrefix}${recording.recordingId}`,
            entityType: ENTITIES.Recording.entityType,
            [ENTITIES.Recording.attributes.TTL]: ddbTimeToLive,
            ...recording,
            [ENTITIES.Recording.attributes.createdAt]: createdAtString
        }
    }).promise();

}

const getRecordingsByExternalMeetingId = async (externalMeetingId) => {
    const resp = await DynamoDB.query({
        TableName: DDB_TABLE,
        KeyConditionExpression: '#PK = :PK and begins_with(#SK, :recording)',
        ExpressionAttributeNames: {
            '#PK': 'PK',
            '#SK': 'SK'
        },
        ExpressionAttributeValues: {
            ':PK': `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            ':recording': `${ENTITIES.Recording.entityPrefix}`,
        },
        ScanIndexForward: true
    }).promise();

    const recordings = resp.Items.filter((i) => i.SK.startsWith(ENTITIES.Recording.entityPrefix));
    return recordings;
}

const setRecordingEndedAt = async (externalMeetingId, recordingId) => {
    const endedAt = new Date().toISOString();
    await DynamoDB.update({
        TableName: DDB_TABLE,
        Key: {
            PK: `${ENTITIES.Meeting.entityPrefix}${externalMeetingId}`,
            SK: `${ENTITIES.Recording.entityPrefix}${recordingId}`
        },
        UpdateExpression: "SET #endedAt = :endedAt",
        ExpressionAttributeNames: {
            "#endedAt": ENTITIES.Recording.attributes.endedAt
        },
        ExpressionAttributeValues: {
            ":endedAt": endedAt
        }
    }).promise();
}

module.exports = {
    putRecording,
    getRecordingsByExternalMeetingId,
    setRecordingEndedAt
}