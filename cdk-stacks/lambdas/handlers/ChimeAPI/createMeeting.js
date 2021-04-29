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
        const createMeetingResult = await MeetingService.createMeeting(req.body['externalMeetingId'], req.body['meetingTitle'], req.body['meetingRegion'], currentUser.username, currentUser.email, req.body['meetingAttendees']);
        console.info('Create meeting result: ', createMeetingResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Create meeting succeed!', data: createMeetingResult });

    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}
