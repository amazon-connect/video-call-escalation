// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const RecordingService = require('../../services/RecordingService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const currentUser = await AuthUtility.getCurrentUser(event);

        const getRecordingSummaryResult = await RecordingService.getRecordingSummary(req.queryStringParameters['externalMeetingId'], currentUser.connectUserId);
        console.info('Get Recording Summary result: ', getRecordingSummaryResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Get Recording Summary succeed!', data: getRecordingSummaryResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}