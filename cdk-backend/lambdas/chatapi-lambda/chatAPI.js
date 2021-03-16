// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const persistance = require('./persistance');
const helpers = require('/opt/helpers')
const ConnectClient = require('aws-sdk/clients/connect');
const Connect = new ConnectClient();

exports.startChat = async (contactFlowId, participantDetails, contactAttributes={}) => {
    if (!contactFlowId) throw new ErrorHandler(400, 'Must provide ContactFlowId');
    if (!participantDetails) throw new ErrorHandler(400, 'Must provide ParticipantDetails');

    const customerEmailAddress = contactAttributes['customerEmailAddress']
    if (!helpers.validateEmailAddress(customerEmailAddress)){
        console.warn('customerEmailAddress not in a valid format')
        throw new ErrorHandler(400, 'Email address not in a valid format')
    } 

    contactAttributes['customerName'] = participantDetails['DisplayName']

    const videoReferenceId = contactAttributes['videoReferenceId']

    if(videoReferenceId && !isNaN(videoReferenceId)){
        const videoRouteToAgent = await getRouteToAgent(videoReferenceId, customerEmailAddress).catch(error => {
            console.error(`startChat: `, error)
            throw new ErrorHandler(500, 'Start Chat Error, please try again later')
        })
        if(!videoRouteToAgent){
            contactAttributes['videoReferenceId'] = 'error'
        }
        else{
            contactAttributes['videoRouteToAgent'] = videoRouteToAgent
        }
    }

    const params = {
        "InstanceId" : process.env.ConnectInstanceId,
        "ContactFlowId" : contactFlowId,
        "Attributes" : contactAttributes,
        "ParticipantDetails" : participantDetails
    }

    const startChatResult = await Connect.startChatContact(params).promise().catch(error => {
        console.error('Connect > startChatContact: ', error);
        throw new ErrorHandler(500, `Connect startChatContact Error, please try again later`);
    })

    return {startChatResult : startChatResult}
}

const getRouteToAgent = async(routeId, customerEmailAddress) => {
    const routeItem = await persistance.getRouteFromDDB(routeId)

    //check if route exists
    if(!routeItem){
        console.warn(`GetRouteToAgent >> Route not found: `, routeId)
        return null
    }

    //check if already used
    if(routeItem.UsedAt)
    {
        console.warn(`GetRouteToAgent >> Route already used: `, routeId)
        return null
    }

    //check if expired
    const currentTime = Math.floor((new Date()).valueOf() / 1000)
    if(routeItem.TTL < currentTime){
        console.warn(`GetRouteToAgent >> Route expired: `, routeId)
        return null
    }

    //validate hash
    const {numHash, hexHash} = helpers.createNumericHash(`${routeItem.OwnerUsername}/${customerEmailAddress}`, routeItem.CreatedAt)
    if(hexHash === routeItem.RouteHash && numHash === parseInt(routeId))
    {
        console.debug(`GetRouteToAgent >> Valid Route match found >> RouteToAgentQueue: `, routeItem.RouteToAgentQueue)
        await persistance.updateRouteUsedAtDDB(routeItem.RouteId)
        return routeItem.RouteToAgentQueue
    }

    console.warn(`GetRouteToAgent >> Route hash does not match: `, routeId)
    return null

}
