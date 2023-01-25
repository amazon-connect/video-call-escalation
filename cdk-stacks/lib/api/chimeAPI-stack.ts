// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as apigw2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw2i from "@aws-cdk/aws-apigatewayv2-integrations";
import * as ddb from '@aws-cdk/aws-dynamodb';

export interface ChimeAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cognitoAuthenticatedRole: iam.IRole;
    readonly appTable: ddb.ITable;
    readonly cdkAppName: string;
}

export class ChimeAPIStack extends cdk.NestedStack {

    public readonly getAttendeeNameLambda: lambda.IFunction;
    public readonly getAttendeeJoinDataLambda: lambda.IFunction;

    public readonly chimeAPI: apigw2.IHttpApi;

    constructor(scope: cdk.Construct, id: string, props: ChimeAPIStackProps) {
        super(scope, id, props);

        /**************************************************************************************************************
        * createMeetingLambda *
        **************************************************************************************************************/
        const createMeetingLambda = new nodeLambda.NodejsFunction(this, 'CreateMeetingLambda', {
            functionName: `${props.cdkAppName}-CreateMeetingLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ChimeAPI/createMeeting.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName
            }
        })
        props.appTable.grantReadWriteData(createMeetingLambda);

        createMeetingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ChimeCreateMeetingAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['chime:CreateMeeting', 'chime:CreateMeetingWithAttendees'],
                    resources: ['*']
                })
            ]
        }));

        /**************************************************************************************************************
        * endMeetingForAllLambda *
        **************************************************************************************************************/
        const endMeetingForAllLambda = new nodeLambda.NodejsFunction(this, 'EndMeetingForAllLambda', {
            functionName: `${props.cdkAppName}-EndMeetingForAllLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ChimeAPI/endMeetingForAll.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName,
            }
        })
        props.appTable.grantReadWriteData(endMeetingForAllLambda);

        endMeetingForAllLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ChimeDeleteMeetingAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['chime:DeleteMeeting'],
                    resources: ['*']
                })
            ]
        }));

        /**************************************************************************************************************
        * getAttendeeJoinDataLambda *
        **************************************************************************************************************/
        const getAttendeeJoinDataLambda = new nodeLambda.NodejsFunction(this, 'GetAttendeeJoinDataLambda', {
            functionName: `${props.cdkAppName}-GetAttendeeJoinDataLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ChimeAPI/getAttendeeJoinData.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName
            }
        })
        props.appTable.grantReadData(getAttendeeJoinDataLambda);
        this.getAttendeeJoinDataLambda = getAttendeeJoinDataLambda;

        /**************************************************************************************************************
        * getAttendeeNameLambda *
        **************************************************************************************************************/
        const getAttendeeNameLambda = new nodeLambda.NodejsFunction(this, 'GetAttendeeNameLambda', {
            functionName: `${props.cdkAppName}-GetAttendeeNameLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ChimeAPI/getAttendeeName.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName
            }
        });
        props.appTable.grantReadData(getAttendeeNameLambda);
        this.getAttendeeNameLambda = getAttendeeNameLambda;

        /**************************************************************************************************************
        * createAttendeeLambda *
        **************************************************************************************************************/
        const createAttendeeLambda = new nodeLambda.NodejsFunction(this, 'CreateAttendeeLambda', {
            functionName: `${props.cdkAppName}-CreateAttendeeLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/ChimeAPI/createAttendee.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName
            }
        });
        props.appTable.grantReadWriteData(createAttendeeLambda);

        createAttendeeLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ChimeCreateAttendeeAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['chime:CreateAttendee'],
                    resources: ['*']
                })
            ]
        }));

        /**************************************************************************************************************
        * ChimeAPI *
        **************************************************************************************************************/
        const chimeAPI = new apigw2.HttpApi(this, 'ChimeAPI', {
            apiName: `${props.cdkAppName}-ChimeAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.POST, apigw2.CorsHttpMethod.GET, apigw2.CorsHttpMethod.DELETE],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
            }
        });

        //create chimeAPI Meeting Resources
        const createMeeting_Route = new apigw2.HttpRoute(this, 'CreateMeeting_Route', {
            httpApi: chimeAPI,
            integration: new apigw2i.HttpLambdaIntegration('createMeetingLambda', createMeetingLambda),
            routeKey: apigw2.HttpRouteKey.with('/meeting', apigw2.HttpMethod.POST)
        });
        const createMeeting_RouteCfn = createMeeting_Route.node.defaultChild as apigw2.CfnRoute;
        createMeeting_RouteCfn.authorizationType = 'AWS_IAM';

        const endMeetingForAll_Route = new apigw2.HttpRoute(this, 'EndMeetingForAll_Route', {
            httpApi: chimeAPI,
            integration: new apigw2i.HttpLambdaIntegration('endMeetingForAllLambda', endMeetingForAllLambda),
            routeKey: apigw2.HttpRouteKey.with('/meeting', apigw2.HttpMethod.DELETE)
        });
        const endMeetingForAll_RouteCfn = endMeetingForAll_Route.node.defaultChild as apigw2.CfnRoute;
        endMeetingForAll_RouteCfn.authorizationType = 'AWS_IAM';

        //Allow Identity Pool to invoke ChimeAPI Meeting resources
        props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'ChimeAPI_MeetingResources', {
            statements: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:${chimeAPI.httpApiId}/$default/${createMeeting_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                    `arn:aws:execute-api:${this.region}:${this.account}:${chimeAPI.httpApiId}/$default/${endMeetingForAll_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                ]
            })]
        }));

        //create chimeAPI Attendee Resources
        const getAttendeeName_Route = new apigw2.HttpRoute(this, 'GetAttendeeName_Route', {
            httpApi: chimeAPI,
            integration: new apigw2i.HttpLambdaIntegration('getAttendeeNameLambda', getAttendeeNameLambda),
            routeKey: apigw2.HttpRouteKey.with('/attendee-name', apigw2.HttpMethod.GET)
        });
        const getAttendeeName_RouteCfn = getAttendeeName_Route.node.defaultChild as apigw2.CfnRoute;
        getAttendeeName_RouteCfn.authorizationType = 'AWS_IAM';

        const createAttendee_Route = new apigw2.HttpRoute(this, 'CreateAttendee_Route', {
            httpApi: chimeAPI,
            integration: new apigw2i.HttpLambdaIntegration('createAttendeeLambda', createAttendeeLambda),
            routeKey: apigw2.HttpRouteKey.with('/attendee', apigw2.HttpMethod.POST)
        });
        const createAttendee_RouteCfn = createAttendee_Route.node.defaultChild as apigw2.CfnRoute;
        createAttendee_RouteCfn.authorizationType = 'AWS_IAM';

        //Allow Identity Pool to invoke ChimeAPI Attendee resources
        props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'ChimeAPI_AttendeeResources', {
            statements: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:${chimeAPI.httpApiId}/$default/${getAttendeeName_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                    `arn:aws:execute-api:${this.region}:${this.account}:${chimeAPI.httpApiId}/$default/${createAttendee_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                ]
            })]
        }));

        this.chimeAPI = chimeAPI;
    }
}