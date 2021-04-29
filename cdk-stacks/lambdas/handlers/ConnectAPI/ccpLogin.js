// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const ConnectService = require('../../services/ConnectService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        const currentUser = await AuthUtility.getCurrentUser(event);

        //Amazon Connect doesn't support + in username, replacing it with _
        const connectUsername = req.body['connectLoginByEmail'] === true ? (`${(currentUser.email.split('@')[0]).replace('+', '_')}@${currentUser.email.split('@')[1]}`) : currentUser.username

        const ccpLoginResult = await ConnectService.ccpLogin(connectUsername);
        console.info(`User logged in successfully!`);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'User logged in successfully!', data: ccpLoginResult });

    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}