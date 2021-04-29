// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const MeetingService = require('../../services/MeetingService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const currentUser = await AuthUtility.getCurrentUser(event);
        const endMeetingResult = await MeetingService.endMeetingForAll(req.body['externalMeetingId'], currentUser.username);
        console.info('End meeting result: ', endMeetingResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'End meeting succeed!', data: endMeetingResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}
