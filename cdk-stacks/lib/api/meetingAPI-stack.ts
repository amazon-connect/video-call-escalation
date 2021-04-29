// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda'
import * as apigw from '@aws-cdk/aws-apigateway'
import * as apigw2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw2i from "@aws-cdk/aws-apigatewayv2-integrations";

export interface MeetingAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly getAttendeeNameLambda: lambda.IFunction;
    readonly getAttendeeJoinDataLambda: lambda.IFunction;
    readonly cdkAppName: string;
}

export class MeetingAPIStack extends cdk.NestedStack {

    public readonly meetingAPI: apigw2.IHttpApi;

    constructor(scope: cdk.Construct, id: string, props: MeetingAPIStackProps) {
        super(scope, id, props);

        //create MeetingAPI Integration
        const meetingAPI = new apigw2.HttpApi(this, 'MeetingAPI', {
            apiName: `${props.cdkAppName}-MeetingAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.websiteAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.POST, apigw2.CorsHttpMethod.GET],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS
            }
        });

        const getAttendeeJoinData_Route = new apigw2.HttpRoute(this, 'GetAttendeeJoinData_Route', {
            httpApi: meetingAPI,
            integration: new apigw2i.LambdaProxyIntegration({ handler: props.getAttendeeJoinDataLambda }),
            routeKey: apigw2.HttpRouteKey.with('/attendee-join-data', apigw2.HttpMethod.GET)
        });

        const getAttendeeName_Route = new apigw2.HttpRoute(this, 'GetAttendeeName_Route', {
            httpApi: meetingAPI,
            integration: new apigw2i.LambdaProxyIntegration({ handler: props.getAttendeeNameLambda }),
            routeKey: apigw2.HttpRouteKey.with('/attendee-name', apigw2.HttpMethod.GET)
        });

        this.meetingAPI = meetingAPI;

    }
}