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

        const startRecordingResult = await RecordingService.startRecording(req.body['externalMeetingId'], req.body['connectContactId'], req.body['videoRecordingPlaybackURL'], currentUser.username, currentUser.email, currentUser.connectUserId);
        console.info('Start Recording result: ', startRecordingResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Start Recording succeed!', data: startRecordingResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}