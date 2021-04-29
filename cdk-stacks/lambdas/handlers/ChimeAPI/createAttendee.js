// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const AttendeeService = require('../../services/AttendeeService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const currentUser = await AuthUtility.getCurrentUser(event);
        const createAttendeeResult = await AttendeeService.createAttendee(req.body['externalMeetingId'], currentUser.username, req.body['attendeeExternalUserId'], req.body['attendeeName'], req.body['attendeeEmail']);
        console.info('Create attendee result: ', createAttendeeResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Create attendee succeed!', data: createAttendeeResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}