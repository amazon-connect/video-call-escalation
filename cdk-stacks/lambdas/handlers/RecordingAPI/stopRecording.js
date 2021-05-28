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

        const stopRecordingResult = await RecordingService.stopRecording(req.body['externalMeetingId'], currentUser.username);
        console.info('Stop Recording result: ', stopRecordingResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Stop Recording succeed!', data: stopRecordingResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}