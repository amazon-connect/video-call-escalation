// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const ConnectService = require('../../services/ConnectService');
const ErrorHandler = require('../../lib/Error');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const currentUser = await AuthUtility.getCurrentUser(event);

        if (currentUser.connectUserId) {
            console.error(`Connect UserId already exists`);
            throw new ErrorHandler(400, 'Connect UserId already exists');
        }
        console.info('Updating connectUserId...');

        //Amazon Connect doesn't support + in username, replacing it with _
        const connectUsername = req.body['connectLoginByEmail'] === true ? (`${(currentUser.email.split('@')[0]).replace('+', '_')}@${currentUser.email.split('@')[1]}`) : currentUser.username
        const setConnectUserIdResult = await ConnectService.setConnectUserId(connectUsername, req.body['connectUserId'], currentUser.username);
        console.info(`Connect User Id set successfully!`);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Connect User Id set successfully!', data: setConnectUserIdResult });

    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}