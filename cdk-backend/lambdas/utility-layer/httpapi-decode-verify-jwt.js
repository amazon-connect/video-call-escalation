// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const axios = require('axios');
const jwkToPem = require('jwk-to-pem');
const {promisify} = require('util');
const jsonwebtoken = require('jsonwebtoken');

let cacheKeys = null;
const getPublicKeys = async (cognitoIssuer) =>{
    if(!cacheKeys){
        consoleLogInfo(`Loading cacheKeys`);
        const url = `${cognitoIssuer}/.well-known/jwks.json`;
        const publicKeys = await axios.get(url);
        cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
            const pem = jwkToPem(current);
            agg[current.kid] = {instance: current, pem};
            return agg;
        }, {});
    }
    else{
        consoleLogInfo(`cacheKeys already loaded`);
    }

    return cacheKeys;
}

const consoleLogInfo = (message) => {
    console.info(`Utility Layer >> decode and verify-jwt >> ${message}`);
}

const consoleLogError = (error) => {
    console.error(`Utility Layer >> decode and verify-jwt >>`, error);
}

const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken));

const handler = async(authorizer, cognitoIdToken) =>{
    
    let result = { username : null, isValid : false, error: null}

    //Supports API Gateway HTTP API payload format 2.0
    const IDP_REGEX = /(.*)\/(.*):CognitoSignIn:(.*)/;

    try{
        const authProvider = authorizer.iam.cognitoIdentity.amr.find(item=>item.match(IDP_REGEX))

        const [, cognitoIDPDomain, cognitoUserPoolId, sub] = authProvider.match(IDP_REGEX);
        const cognitoIssuer = `https://${cognitoIDPDomain}/${cognitoUserPoolId}`;

        const tokenSections = cognitoIdToken.split('.');
        if(tokenSections.length < 2){
            throw new Error('Requested token is invalid');
        }
        const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
        const header = JSON.parse(headerJSON);
        const keys = await getPublicKeys(cognitoIssuer);
        const key = keys[header.kid];
        if(!key){
            throw new Error('Claim made for unknown kid')
        }
        const claim = await verifyPromised(cognitoIdToken, key.pem);

        const currentSeconds = Math.floor((new Date()).valueOf() / 1000);
        if (currentSeconds > claim.exp || currentSeconds < claim.auth_time){
            throw new Error('Claim is expired or invalid');
        }
        if(claim.iss !== cognitoIssuer){
            throw new Error('Claim issuer is invalid');
        }
        if(claim.token_use !== 'id'){
            throw new Error('Claim token_use is not id');
        }

        if(claim.sub !== sub){
            throw new Error('Claim subject does not match');
        }

        consoleLogInfo(`claim confirmed for ${claim['cognito:username']}`);
        result = {
            username: claim['cognito:username'],
            cognito_groups : claim['cognito:groups'],
            email: claim['email'],
            isValid: true
        }
    }
    catch(error)
    {
        consoleLogError(error);
        result['error'] = error;
    }

    return result;
}

module.exports = handler;