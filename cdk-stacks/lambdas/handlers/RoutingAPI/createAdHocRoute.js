// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const RoutingService = require('../../services/RoutingService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const currentUser = await AuthUtility.getCurrentUser(event);

        const createAdHocRouteResult = await RoutingService.createAdHocRoute(currentUser.username, req.body['attendeeEmail'], req.body['routeToAgentQueue'])
        console.info(`AdHoc route created successfully!`);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'AdHoc route created successfully!', data: createAdHocRouteResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }

}