// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as apigw2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw2i from "@aws-cdk/aws-apigatewayv2-integrations";
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';

export interface ChatAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly appTable: ddb.ITable;
    readonly cdkAppName: string;
}

export class ChatAPIStack extends cdk.NestedStack {

    public readonly chatAPI: apigw2.IHttpApi;

    constructor(scope: cdk.Construct, id: string, props: ChatAPIStackProps) {
        super(scope, id, props);

        //create startChat Lambda
        const startChatLambda = new nodeLambda.NodejsFunction(this, 'StartChatLambda', {
            functionName: `${props.cdkAppName}-StartChatLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ChatAPI/startChat.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                ConnectInstanceId: props.SSMParams.connectInstanceARN.split('/')[1],
                DDB_TABLE: props.appTable.tableName,
            }
        });
        props.appTable.grantReadWriteData(startChatLambda);

        //Allow chatAPI to invoke Amazon Connect
        startChatLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectChatAPIAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:StartChatContact"],
                    resources: [props.SSMParams.connectInstanceARN + '/*']
                })
            ]
        }));

        const chatAPI = new apigw2.HttpApi(this, 'ChatAPI', {
            apiName: `${props.cdkAppName}-ChatAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.websiteAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.POST],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS
            }
        });

        const startChat_Route = new apigw2.HttpRoute(this, 'StartChat_Route', {
            httpApi: chatAPI,
            integration: new apigw2i.HttpLambdaIntegration('startChatLambda', startChatLambda),
            routeKey: apigw2.HttpRouteKey.with('/start', apigw2.HttpMethod.POST)
        });

        this.chatAPI = chatAPI;
    }
}