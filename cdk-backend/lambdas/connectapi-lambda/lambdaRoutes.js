// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const getUserFromJWT = require('/opt/httpapi-decode-verify-jwt');
const connectAPI = require('./connectAPI');

let lambdaRoutesMap = new Map()


/**********************
 * CCP Login method *
 **********************/
lambdaRoutesMap.set('POST /ccplogin', async (req)=>{
    const currentUser = await getUser(req)

    //Amazon Connect doesn't support + in username, replacing it with _
    const connectUsername = req.body['connectLoginByEmail'] === true ? (`${(currentUser.email.split('@')[0]).replace('+', '_')}@${currentUser.email.split('@')[1]}`) : currentUser.username

    const ccpLoginResult = await connectAPI.ccpLogin(connectUsername)
    console.log(`User logged in successfully!`)
    return {body : { success: 'User logged in successfully!', data: ccpLoginResult }}
})



/**********************
* Helper methods *
**********************/

const getUser = async (req) => {
    const currentUser = await getUserFromJWT(req.requestContext.authorizer, req.headers.cognitoidtoken);
    if (currentUser.isValid) return currentUser;
    throw new ErrorHandler(403, 'CCP Login Error, user not valid');
}

module.exports = (route) => {
    return lambdaRoutesMap.get(route)
}