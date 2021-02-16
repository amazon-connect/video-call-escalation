// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const ConnectClient = require('aws-sdk/clients/connect');
const Connect = new ConnectClient();

exports.startChat = async (contactFlowId, participantDetails, contactAttributes={}) => {
    if (!contactFlowId) throw new ErrorHandler(400, 'Must provide ContactFlowId');
    if (!participantDetails) throw new ErrorHandler(400, 'Must provide ParticipantDetails');

    contactAttributes['customerName'] = participantDetails['DisplayName'];

    const params = {
        "InstanceId" : process.env.ConnectInstanceId,
        "ContactFlowId" : contactFlowId,
        "Attributes" : contactAttributes,
        "ParticipantDetails" : participantDetails
    }

    const startChatResult = await Connect.startChatContact(params).promise().catch(error => {
        console.error('Connect > startChatContact: ', error);
        throw new ErrorHandler(500, 'Connect startChatContact Error, please try again later');
    })

    return {startChatResult : startChatResult}
}