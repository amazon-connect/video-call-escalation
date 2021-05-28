// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const ConnectService = require('../../services/ConnectService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const currentUser = await AuthUtility.getCurrentUser(event);

        const putConnectUserCacheResult = await ConnectService.putConnectUserCache(currentUser.connectUserId);
        const respMessage = putConnectUserCacheResult ? `Put Connect User Cache successfully!` : `Skipping Put Connect User Cache!`
        console.info(respMessage);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: respMessage, data: putConnectUserCacheResult });

    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}