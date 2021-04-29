// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const buildLambdaResponse = (context, statusCode = 200, body = {}, headers = { 'Content-Type': 'application/json' }) => {
    body.reqId = context.awsRequestId
    return {
        statusCode: statusCode,
        body: JSON.stringify(body),
        headers: headers
    }
}

const parseEventBody = (event) => {
    if (event.headers['content-type'] && event.headers['content-type'].match(/application\/json/i)) {
        const parsedBody = JSON.parse(event.body);
        return { ...event, body: parsedBody }
    }
    return event;
}

module.exports = {
    buildLambdaResponse,
    parseEventBody
}