// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AttendeeService = require('../../services/AttendeeService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const getAttendeeNameResult = await AttendeeService.getAttendeeName(req.queryStringParameters['externalMeetingId'], req.queryStringParameters['attendeeExternalUserId']);
        console.info('Get Attendee result: ', getAttendeeNameResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Get Attendee Name succeed!', data: getAttendeeNameResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}