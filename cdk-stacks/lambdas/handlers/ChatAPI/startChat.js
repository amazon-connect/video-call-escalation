// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const ChatService = require('../../services/ChatService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const req = LambdaUtility.parseEventBody(event);
        //this is needed due to 'amazon-connect-chat-interface' not setting proper headers (content-type) and sending stringified JSON in the body
        const bodyStr = req.isBase64Encoded ? Buffer.from(req.body, 'base64').toString('utf8') : req.body
        const bodyJSON = JSON.parse(bodyStr);

        const startChatResult = await ChatService.startChat(bodyJSON['ContactFlowId'], bodyJSON['ParticipantDetails'], bodyJSON['Attributes']);
        console.info('Start chat result: ', startChatResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Start chat succeed!', data: startChatResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}