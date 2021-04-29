// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AttendeeService = require('../../services/AttendeeService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const getAttendeeJoinDataResult = await AttendeeService.getAttendeeJoinData(req.queryStringParameters['externalMeetingId'], req.queryStringParameters['attendeeExternalUserId']);
        console.info('Get Attendee Join Data result: ', getAttendeeJoinDataResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Get Attendee Join Data succeed!', data: getAttendeeJoinDataResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}