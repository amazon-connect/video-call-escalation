// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const lambdaRoutes = require('./lambdaRoutes');

exports.handler = async (event, context) => {
  try {
    console.debug(`Route: ${event.routeKey}, Event: `, event)

    if (event.headers['content-type'] && event.headers['content-type'].match(/application\/json/i)) event.body = JSON.parse(event.body)

    const selectedRoute = lambdaRoutes(event.routeKey)
    if(!selectedRoute) throw new ErrorHandler(404, `Unsupported routeKey`);

    const {statusCode, body, headers} = await selectedRoute(event)
    return buildLambdaResponse(context, statusCode, body, headers)
  }
  catch (err) {
    console.error(err);
    return buildLambdaResponse(context, err.statusCode || 500, { message: err.message })
  }
}

const buildLambdaResponse = (context, statusCode=200, body={}, headers={ 'Content-Type': 'application/json' }) => {
  body.reqId = context.awsRequestId
  return{
    statusCode : statusCode,
    body : JSON.stringify(body),
    headers : headers
  }
}
