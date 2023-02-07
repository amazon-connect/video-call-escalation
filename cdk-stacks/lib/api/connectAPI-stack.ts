// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam';
import * as apigw from '@aws-cdk/aws-apigateway'
import * as apigw2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw2i from "@aws-cdk/aws-apigatewayv2-integrations";
import * as ddb from '@aws-cdk/aws-dynamodb';

export interface ConnectAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cognitoAuthenticatedRole: iam.IRole;
    readonly cognitoUserPoolId: string;
    readonly cognitoUserPoolARN: string;
    readonly appTable: ddb.ITable;
    readonly cdkAppName: string;
}

export class ConnectAPIStack extends cdk.NestedStack {

    public readonly connectAPI: apigw2.IHttpApi;
    public readonly ccpLambdaRoleArn: string | undefined;
    public readonly ccpLambdaRoleName: string | undefined;

    constructor(scope: cdk.Construct, id: string, props: ConnectAPIStackProps) {
        super(scope, id, props);

        const ccpLoginLambda = new nodeLambda.NodejsFunction(this, 'CCPLoginLambda', {
            functionName: `${props.cdkAppName}-CCPLoginLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ConnectAPI/ccpLogin.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                ConnectInstanceId: props.SSMParams.connectInstanceARN.split('/')[1],
            }
        });

        //giving lambda role permission to assume its self
        ccpLoginLambda.role?.grantAssumeRole(ccpLoginLambda.role);

        //Allow connectAPILambda to invoke Amazon Connect
        ccpLoginLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectGetFederationTokenAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:GetFederationToken"],
                    resources: [props.SSMParams.connectInstanceARN + '/user/*']
                })
            ]
        }));

        //Allow connectAPILambda to invoke STS
        ccpLoginLambda.role?.attachInlinePolicy(new iam.Policy(this, 'STSAssumeRoleAccess', {
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

        const putConnectUserCacheLambda = new nodeLambda.NodejsFunction(this, 'PutConnectUserCacheLambda', {
            functionName: `${props.cdkAppName}-PutConnectUserCacheLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ConnectAPI/putConnectUserCache.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                ConnectInstanceId: props.SSMParams.connectInstanceARN.split('/')[1],
                DDB_TABLE: props.appTable.tableName
            }
        });
        props.appTable.grantReadWriteData(putConnectUserCacheLambda);

        putConnectUserCacheLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectDescribeUserAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:DescribeUser"],
                    resources: [
                        props.SSMParams.connectInstanceARN + '/user/*',
                        props.SSMParams.connectInstanceARN + '/agent/*'
                    ]
                })
            ]
        }));

        putConnectUserCacheLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectDescribeUserHierarchyGroupAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:DescribeUserHierarchyGroup"],
                    resources: [props.SSMParams.connectInstanceARN + '/agent-group/*']
                })
            ]
        }));


        const setConnectUserIdLambda = new nodeLambda.NodejsFunction(this, 'SetConnectUserIdLambda', {
            functionName: `${props.cdkAppName}-SetConnectUserIdLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ConnectAPI/setConnectUserId.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                ConnectInstanceId: props.SSMParams.connectInstanceARN.split('/')[1],
                CognitoUserPoolId: props.cognitoUserPoolId,
                DDB_TABLE: props.appTable.tableName
            }
        });

        setConnectUserIdLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectDescribeUserAccess2', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:DescribeUser"],
                    resources: [
                        props.SSMParams.connectInstanceARN + '/user/*',
                        props.SSMParams.connectInstanceARN + '/agent/*'
                    ]
                })
            ]
        }));

        setConnectUserIdLambda.role?.attachInlinePolicy(new iam.Policy(this, 'CognitoUpdateUserAttributesAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["cognito-idp:AdminUpdateUserAttributes"],
                    resources: [props.cognitoUserPoolARN]
                })
            ]
        }));


        //create ConnectAPI Integration
        const connectAPI = new apigw2.HttpApi(this, 'ConnectAPI', {
            apiName: `${props.cdkAppName}-ConnectAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.POST, apigw2.CorsHttpMethod.PUT],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
            }
        });

        const ccpLogin_Route = new apigw2.HttpRoute(this, 'CCPLogin_Route', {
            httpApi: connectAPI,
            integration: new apigw2i.HttpLambdaIntegration('ccpLoginLambda', ccpLoginLambda),
            routeKey: apigw2.HttpRouteKey.with('/ccplogin', apigw2.HttpMethod.POST)
        });
        const ccpLogin_RouteCfn = ccpLogin_Route.node.defaultChild as apigw2.CfnRoute;
        ccpLogin_RouteCfn.authorizationType = 'AWS_IAM';

        const setConnectUserId_Route = new apigw2.HttpRoute(this, 'SetConnectUserId_Route', {
            httpApi: connectAPI,
            integration: new apigw2i.HttpLambdaIntegration('setConnectUserIdLambda', setConnectUserIdLambda),
            routeKey: apigw2.HttpRouteKey.with('/setConnectUserId', apigw2.HttpMethod.POST)
        });
        const setConnectUserId_RouteCfn = setConnectUserId_Route.node.defaultChild as apigw2.CfnRoute;
        setConnectUserId_RouteCfn.authorizationType = 'AWS_IAM';

        const putConnectUserCache_Route = new apigw2.HttpRoute(this, 'PutConnectUserCache_Route', {
            httpApi: connectAPI,
            integration: new apigw2i.HttpLambdaIntegration('putConnectUserCacheLambda', putConnectUserCacheLambda),
            routeKey: apigw2.HttpRouteKey.with('/connect-user-cache', apigw2.HttpMethod.PUT)
        })
        const putConnectUserCache_RouteCfn = putConnectUserCache_Route.node.defaultChild as apigw2.CfnRoute;
        putConnectUserCache_RouteCfn.authorizationType = 'AWS_IAM';

        //Allow Identity Pool to invoke ConnectAPI Login resource
        props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'ConnectAPI_Resources', {
            statements: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:${connectAPI.httpApiId}/$default/${ccpLogin_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                    `arn:aws:execute-api:${this.region}:${this.account}:${connectAPI.httpApiId}/$default/${setConnectUserId_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                    `arn:aws:execute-api:${this.region}:${this.account}:${connectAPI.httpApiId}/$default/${putConnectUserCache_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                ]
            })]
        }));

        this.ccpLambdaRoleArn = ccpLoginLambda.role?.roleArn
        this.ccpLambdaRoleName = ccpLoginLambda.role?.roleName
        this.connectAPI = connectAPI;

    }
}
