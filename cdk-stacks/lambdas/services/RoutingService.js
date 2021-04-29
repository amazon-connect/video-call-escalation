// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');
const HashUtility = require('../lib/HashUtility');
const CommonUtility = require('../lib/CommonUtility');
const RoutingRepo = require('../repository/RoutingRepo');


const createAdHocRoute = async (routeOwnerUsername, attendeeEmail, routeToAgentQueue) => {

    if (!routeOwnerUsername) throw new ErrorHandler(400, 'Must provide routeOwnerUsername');
    if (!attendeeEmail) throw new ErrorHandler(400, 'Must provide Attendee Email');
    if (!CommonUtility.validateEmailAddress(attendeeEmail)) throw new ErrorHandler(400, 'Email address not in a valid format')
    if (!routeToAgentQueue) throw new ErrorHandler(400, 'Must provide routeToAgentQueue');

    const adHocRouteTTL = 15 //minutes
    const createdAt = new Date()
    const { numHash, hexHash } = HashUtility.createNumericHash(`${routeOwnerUsername}/${attendeeEmail}`, createdAt.toISOString())

    const route = {
        routeId: numHash,
        routeHash: hexHash,
        ownerUsername: routeOwnerUsername,
        routeToAgentQueue,
        attendeeEmail,
        createdAt
    }

    await RoutingRepo.putRoute(route, adHocRouteTTL).catch(error => {
        console.error('putRouteInDDB: ', error);
        throw new ErrorHandler(500, 'Create Ad-Hoc Route Error, please try again later');
    });

    return numHash;
}

const getRouteToAgent = async (routeId, customerEmailAddress) => {
    const routeItem = await RoutingRepo.getRouteById(routeId);

    //check if route exists
    if (!routeItem) {
        console.warn(`GetRouteToAgent >> Route not found: `, routeId);
        return null;
    }

    //check if already used
    if (routeItem.usedAt) {
        console.warn(`GetRouteToAgent >> Route already used: `, routeId);
        return null;
    }

    //check if expired
    const currentTime = Math.floor((new Date()).valueOf() / 1000);
    if (routeItem.TTL < currentTime) {
        console.warn(`GetRouteToAgent >> Route expired: `, routeId);
        return null;
    }

    //validate hash
    const { numHash, hexHash } = HashUtility.createNumericHash(`${routeItem.ownerUsername}/${customerEmailAddress}`, routeItem.createdAt);
    if (hexHash === routeItem.routeHash && numHash === parseInt(routeId)) {
        console.debug(`GetRouteToAgent >> Valid Route match found >> RouteToAgentQueue: `, routeItem.routeToAgentQueue);
        await RoutingRepo.setRouteUsedAt(routeItem.routeId);
        return routeItem.routeToAgentQueue;
    }

    console.warn(`GetRouteToAgent >> Route hash does not match: `, routeId);
    return null;

}

module.exports = {
    createAdHocRoute,
    getRouteToAgent
}