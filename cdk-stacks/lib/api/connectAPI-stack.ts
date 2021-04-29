// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam';
import * as apigw from '@aws-cdk/aws-apigateway'
import * as apigw2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw2i from "@aws-cdk/aws-apigatewayv2-integrations";

export interface ConnectAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cognitoAuthenticatedRole: iam.IRole;
    readonly cdkAppName: string;
}

export class ConnectAPIStack extends cdk.NestedStack {

    public readonly connectAPI: apigw2.IHttpApi;

    constructor(scope: cdk.Construct, id: string, props: ConnectAPIStackProps) {
        super(scope, id, props);

        const ccpLoginLambda = new nodeLambda.NodejsFunction(this, 'CCPLoginLambda', {
            functionName: `${props.cdkAppName}-CCPLoginLambda`,
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: 'lambdas/handlers/ConnectAPI/ccpLogin.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                ConnectInstanceId: props.SSMParams.connectInstanceARN.split('/')[1]
            }
        });

        //Allow connectAPILambda to invoke Amazon Connect
        ccpLoginLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectAPIAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:GetFederationToken"],
                    resources: [props.SSMParams.connectInstanceARN + '/user/*']
                })
            ]
        }));

        //Allow connectAPILambda to invoke STS
        ccpLoginLambda.role?.attachInlinePolicy(new iam.Policy(this, 'STSAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["sts:AssumeRole"],
                    resources: [props.SSMParams.ccpLoginLambdaRoleToAssume === props.SSMParams.SSM_NOT_DEFINED ? ccpLoginLambda.role.roleArn : props.SSMParams.ccpLoginLambdaRoleToAssume]
                })
            ]
        }));

        //add env variable - RoleToAssume
        ccpLoginLambda.addEnvironment('RoleToAssume', props.SSMParams.ccpLoginLambdaRoleToAssume === props.SSMParams.SSM_NOT_DEFINED ? ccpLoginLambda.role?.roleArn || '' : props.SSMParams.ccpLoginLambdaRoleToAssume);

        //create ConnectAPI Integration
        const connectAPI = new apigw2.HttpApi(this, 'ConnectAPI', {
            apiName: `${props.cdkAppName}-ConnectAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.POST],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
            }
        });

        const ccpLogin_Route = new apigw2.HttpRoute(this, 'CCPLogin_Route', {
            httpApi: connectAPI,
            integration: new apigw2i.LambdaProxyIntegration({ handler: ccpLoginLambda }),
            routeKey: apigw2.HttpRouteKey.with('/ccplogin', apigw2.HttpMethod.POST)
        });

        const ccpLogin_RouteCfn = ccpLogin_Route.node.defaultChild as apigw2.CfnRoute;
        ccpLogin_RouteCfn.authorizationType = 'AWS_IAM';

        //Allow Identity Pool to invoke ConnectAPI Login resource
        props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'ConnectAPI_CCPLoginResources', {
            statements: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [`arn:aws:execute-api:${this.region}:${this.account}:${connectAPI.httpApiId}/$default/${ccpLogin_RouteCfn.routeKey.replace(/\s+/g, '')}`]
            })]
        }));

        this.connectAPI = connectAPI;

    }
}
