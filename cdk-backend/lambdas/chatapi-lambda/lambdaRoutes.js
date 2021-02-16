// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const chatAPI = require('./chatAPI');

let lambdaRoutesMap = new Map()

/**********************
* Start Chat method *
**********************/

lambdaRoutesMap.set('POST /start', async (req) => {

  //this is needed due to 'amazon-connect-chat-interface' not setting proper headers (content-type) and sending stringified JSON in the body
  const bodyJSON = JSON.parse(Buffer.from(req.body, 'base64').toString('utf8'));

  const startChatResult = await chatAPI.startChat(bodyJSON['ContactFlowId'], bodyJSON['ParticipantDetails'], bodyJSON['Attributes']);
  console.info('Start chat result: ', startChatResult);
  return { body: { success: 'Start chat succeed!', data: startChatResult } }
})



module.exports = (route) => {
  return lambdaRoutesMap.get(route)
}
