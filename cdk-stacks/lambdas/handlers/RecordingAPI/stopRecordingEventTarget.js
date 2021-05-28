// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const RecordingService = require('../../services/RecordingService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const externalMeetingId = event.detail?.externalMeetingId;

        const stopRecordingEventTargetResult = await RecordingService.stopRecordingEventTarget(externalMeetingId);
        console.info('Stop Recording Event Target result: ', stopRecordingEventTargetResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Stop Recording Event Target succeed!', data: stopRecordingEventTargetResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}