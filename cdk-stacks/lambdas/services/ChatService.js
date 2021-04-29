// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');
const CommonUtility = require('../lib/CommonUtility');
const RoutingService = require('../services/RoutingService');
const ConnectClient = require('aws-sdk/clients/connect');
const Connect = new ConnectClient();


const startChat = async (contactFlowId, participantDetails, contactAttributes = {}) => {
    if (!contactFlowId) throw new ErrorHandler(400, 'Must provide ContactFlowId');
    if (!participantDetails) throw new ErrorHandler(400, 'Must provide ParticipantDetails');

    const customerEmailAddress = contactAttributes['customerEmailAddress']
    if (!CommonUtility.validateEmailAddress(customerEmailAddress)) {
        console.warn('customerEmailAddress not in a valid format')
        throw new ErrorHandler(400, 'Email address not in a valid format')
    }

    contactAttributes['customerName'] = participantDetails['DisplayName']

    const videoReferenceId = contactAttributes['videoReferenceId']

    if (videoReferenceId && !isNaN(videoReferenceId)) {
        const videoRouteToAgent = await RoutingService.getRouteToAgent(videoReferenceId, customerEmailAddress).catch(error => {
            console.error(`startChat: `, error)
            throw new ErrorHandler(500, 'Start Chat Error, please try again later')
        })
        if (!videoRouteToAgent) {
            contactAttributes['videoReferenceId'] = 'error'
        }
        else {
            contactAttributes['videoRouteToAgent'] = videoRouteToAgent
        }
    }

    const params = {
        "InstanceId": process.env.ConnectInstanceId,
        "ContactFlowId": contactFlowId,
        "Attributes": contactAttributes,
        "ParticipantDetails": participantDetails
    }

    const startChatResult = await Connect.startChatContact(params).promise().catch(error => {
        console.error('Connect > startChatContact: ', error);
        throw new ErrorHandler(500, `Connect startChatContact Error, please try again later`);
    })

    return { startChatResult: startChatResult }
}

module.exports = {
    startChat
}