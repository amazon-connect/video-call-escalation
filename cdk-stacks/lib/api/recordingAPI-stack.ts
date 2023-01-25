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

export interface RecordingAPIStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cognitoAuthenticatedRole: iam.IRole;
    readonly appTable: ddb.ITable;
    readonly cdkAppName: string;
    readonly recordingECSClusterARN: string;
    readonly recordingECSClusterName: string;
    readonly recordingContainerName: string;
    readonly recordingTaskDefinitionARN: string;
    readonly recordingBucketName: string;
    readonly recordingTaskDefinitionExecutionRoleARN: string;
}

export class RecordingAPIStack extends cdk.NestedStack {

    public readonly recordingAPI: apigw2.IHttpApi;

    constructor(scope: cdk.Construct, id: string, props: RecordingAPIStackProps) {
        super(scope, id, props);

        //create startRecording Lambda
        const startRecordingLambda = new nodeLambda.NodejsFunction(this, 'StartRecordingLambda', {
            functionName: `${props.cdkAppName}-StartRecordingLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/RecordingAPI/startRecording.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName,
                ECS_CLUSTER_ARN: props.recordingECSClusterARN,
                ECS_CONTAINER_NAME: props.recordingContainerName,
                ECS_TASK_DEFINITION_ARN: props.recordingTaskDefinitionARN,
                RECORDING_BUCKET_NAME: props.recordingBucketName,
                RECORDING_SCREEN_WIDTH: "1920",
                RECORDING_SCREEN_HEIGHT: "1080",
                RECORDING_ATTENDEE_NAME: props.SSMParams.recordingAttendeeName,
                ConnectInstanceId: props.SSMParams.connectInstanceARN.split('/')[1]
            }
        });
        props.appTable.grantReadWriteData(startRecordingLambda);

        startRecordingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ChimeCreateAttendeeAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['chime:CreateAttendee'],
                    resources: ['*']
                })
            ]
        }));

        startRecordingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ECSRunTaskAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ecs:RunTask'],
                    resources: [props.recordingTaskDefinitionARN]
                })
            ]
        }));

        startRecordingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'IAMPassRoleAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:PassRole'],
                    resources: [props.recordingTaskDefinitionExecutionRoleARN]
                })
            ]
        }));

        startRecordingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectUpdateContactAttributesAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['connect:UpdateContactAttributes'],
                    resources: [`${props.SSMParams.connectInstanceARN}/contact/*`]
                })
            ]
        }));


        //create stopRecording Lambda
        const stopRecordingLambda = new nodeLambda.NodejsFunction(this, 'StopRecordingLambda', {
            functionName: `${props.cdkAppName}-StopRecordingLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/RecordingAPI/stopRecording.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName,
                ECS_CLUSTER_ARN: props.recordingECSClusterARN,
            }
        });
        props.appTable.grantReadWriteData(stopRecordingLambda);

        stopRecordingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ECSStopTaskAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ecs:StopTask'],
                    resources: [`arn:aws:ecs:${this.region}:${this.account}:task/${props.recordingECSClusterName}/*`]
                })
            ]
        }));

        stopRecordingLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ChimeDeleteAttendeeAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['chime:DeleteAttendee'],
                    resources: ['*']
                })
            ]
        }));


        //create getRecordingSummary Lambda
        const getRecordingSummaryLambda = new nodeLambda.NodejsFunction(this, 'GetRecordingSummaryLambda', {
            functionName: `${props.cdkAppName}-GetRecordingSummaryLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/RecordingAPI/getRecordingSummary.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName,
                recordingPlaybackSecurityProfileId: props.SSMParams.recordingPlaybackSecurityProfileId,
                recordingPresignedURLExpiresMinutes: props.SSMParams.recordingPresignedURLExpiresMinutes
            }
        });
        props.appTable.grantReadData(getRecordingSummaryLambda);

        getRecordingSummaryLambda.role?.attachInlinePolicy(new iam.Policy(this, 'S3PreSignedAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['S3:GetObject'],
                    resources: [`arn:aws:s3:::${props.recordingBucketName}/RECORDINGS/*`]
                })
            ]
        }))


        const recordingAPI = new apigw2.HttpApi(this, 'RecordingAPI', {
            apiName: `${props.cdkAppName}-RecordingAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.GET, apigw2.CorsHttpMethod.POST, apigw2.CorsHttpMethod.DELETE],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
            }
        });

        const startRecording_Route = new apigw2.HttpRoute(this, 'StartRecording_Route', {
            httpApi: recordingAPI,
            integration: new apigw2i.HttpLambdaIntegration('startRecordingLambda', startRecordingLambda),
            routeKey: apigw2.HttpRouteKey.with('/recording', apigw2.HttpMethod.POST)
        });
        const startRecording_RouteCfn = startRecording_Route.node.defaultChild as apigw2.CfnRoute;
        startRecording_RouteCfn.authorizationType = 'AWS_IAM';

        const stopRecording_Route = new apigw2.HttpRoute(this, 'StopRecording_Route', {
            httpApi: recordingAPI,
            integration: new apigw2i.HttpLambdaIntegration('stopRecordingLambda', stopRecordingLambda),
            routeKey: apigw2.HttpRouteKey.with('/recording', apigw2.HttpMethod.DELETE)
        });
        const stopRecording_RouteCfn = stopRecording_Route.node.defaultChild as apigw2.CfnRoute;
        stopRecording_RouteCfn.authorizationType = 'AWS_IAM';

        const getRecordingSummary_Route = new apigw2.HttpRoute(this, 'GetRecordingSummary_Route', {
            httpApi: recordingAPI,
            integration: new apigw2i.HttpLambdaIntegration('getRecordingSummaryLambda', getRecordingSummaryLambda),
            routeKey: apigw2.HttpRouteKey.with('/recording-summary', apigw2.HttpMethod.GET)
        });
        const getRecordingSummary_RouteCfn = getRecordingSummary_Route.node.defaultChild as apigw2.CfnRoute;
        getRecordingSummary_RouteCfn.authorizationType = 'AWS_IAM';

        //Allow Identity Pool to invoke RecordingAPI resource
        props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'RecordingAPI_StartRecordingResource', {
            statements: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:${recordingAPI.httpApiId}/$default/${startRecording_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                    `arn:aws:execute-api:${this.region}:${this.account}:${recordingAPI.httpApiId}/$default/${stopRecording_RouteCfn.routeKey.replace(/\s+/g, '')}`,
                    `arn:aws:execute-api:${this.region}:${this.account}:${recordingAPI.httpApiId}/$default/${getRecordingSummary_RouteCfn.routeKey.replace(/\s+/g, '')}`
                ]
            })]
        }));

        this.recordingAPI = recordingAPI
    }
}