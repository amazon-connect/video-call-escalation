// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const getUserFromJWT = require('/opt/httpapi-decode-verify-jwt');
const routingAPI = require('./routingAPI');

let lambdaRoutesMap = new Map()


/**********************
 * Routing methods *
 **********************/
lambdaRoutesMap.set('POST /adhoc', async (req)=>{
    const currentUser = await getUser(req)
    const createAdHocRouteResult = await routingAPI.createAdHocRoute(currentUser.username, req.body['attendeeEmail'], req.body['routeToAgentQueue'])
    console.log(`AdHoc route created successfully!`)
    return {body : { success: 'AdHoc route created successfully!', data: createAdHocRouteResult }}
})



/**********************
* Helper methods *
**********************/

const getUser = async (req) => {
    const currentUser = await getUserFromJWT(req.requestContext.authorizer, req.headers.cognitoidtoken);
    if (currentUser.isValid) return currentUser;
    throw new ErrorHandler(403, 'User not valid');
}

module.exports = (route) => {
    return lambdaRoutesMap.get(route)
}