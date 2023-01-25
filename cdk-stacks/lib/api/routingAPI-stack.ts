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

export interface RoutingAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cognitoAuthenticatedRole: iam.IRole;
    readonly appTable: ddb.ITable;
    readonly cdkAppName: string;
}

export class RoutingAPIStack extends cdk.NestedStack {

    public readonly routingAPI: apigw2.IHttpApi;

    constructor(scope: cdk.Construct, id: string, props: RoutingAPIStackProps) {
        super(scope, id, props);

        //create createAdHocRoute Lambda
        const createAdHocRouteLambda = new nodeLambda.NodejsFunction(this, 'CreateAdHocRouteLambda', {
            functionName: `${props.cdkAppName}-CreateAdHocRouteLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/RoutingAPI/createAdHocRoute.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName,
            }
        });
        props.appTable.grantReadWriteData(createAdHocRouteLambda);

        const routingAPI = new apigw2.HttpApi(this, 'RoutingAPI', {
            apiName: `${props.cdkAppName}-RoutingAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.POST],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
            }
        });

        const createAdHocRoute_Route = new apigw2.HttpRoute(this, 'CreateAdHocRoute_Route', {
            httpApi: routingAPI,
            integration: new apigw2i.HttpLambdaIntegration('createAdHocRouteLambda', createAdHocRouteLambda),
            routeKey: apigw2.HttpRouteKey.with('/adhoc', apigw2.HttpMethod.POST)
        });

        const createAdHocRoute_RouteCfn = createAdHocRoute_Route.node.defaultChild as apigw2.CfnRoute;
        createAdHocRoute_RouteCfn.authorizationType = 'AWS_IAM';

        //Allow Identity Pool to invoke RoutingAPI resource
        props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'RoutingAPI_RoutingResources', {
            statements: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [`arn:aws:execute-api:${this.region}:${this.account}:${routingAPI.httpApiId}/$default/${createAdHocRoute_RouteCfn.routeKey.replace(/\s+/g, '')}`]
            })]
        }));

        this.routingAPI = routingAPI;
    }
}