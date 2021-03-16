// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const persistance = require('./persistance');
const helpers = require('/opt/helpers')

exports.createAdHocRoute = async (routeOwnerUsername, attendeeEmail, routeToAgentQueue) => {

    if (!routeOwnerUsername) throw new ErrorHandler(400, 'Must provide routeOwnerUsername');
    if (!attendeeEmail) throw new ErrorHandler(400, 'Must provide Attendee Email');
    if (!helpers.validateEmailAddress(attendeeEmail)) throw new ErrorHandler(400, 'Email address not in a valid format')
    if (!routeToAgentQueue) throw new ErrorHandler(400, 'Must provide routeToAgentQueue');

    const adHocRouteTTL = 15 //minutes
    const createdAt = new Date()
    const {numHash, hexHash} = helpers.createNumericHash(`${routeOwnerUsername}/${attendeeEmail}`, createdAt.toISOString())

    await persistance.putRouteInDDB(numHash, hexHash, routeOwnerUsername, routeToAgentQueue, attendeeEmail, createdAt, adHocRouteTTL).catch(error => {
        console.error('putRouteInDDB: ', error);
        throw new ErrorHandler(500, 'Create Ad-Hoc Route Error, please try again later');
    });

    return numHash
}