// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as events from "@aws-cdk/aws-events";
import * as events_targets from "@aws-cdk/aws-events-targets";
import * as lambda from '@aws-cdk/aws-lambda';
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';

const configParams = require('../../config.params.json');

export interface CdkChimeEventBridgeStackProps extends cdk.StackProps {
    readonly cdkBackendStackRegion: string;
    readonly appTable: ddb.ITable;
    readonly recordingECSClusterARN: string;
    readonly recordingECSClusterName: string;
}

export class CdkChimeEventBridgeStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: CdkChimeEventBridgeStackProps) {
        super(scope, id, props);

        //Subscribe to Amazon Chime SDK meeting ends
        const chimeMeetingEndsRule = new events.Rule(this, 'ChimeMeetingEndsRule', {
            description: `Rule triggered by Amazon Chime SDK, when an active meeting ends.`,
            eventPattern: {
                source: ['aws.chime'],
                detail: {
                    'eventType': ['chime:MeetingEnded']
                }
            }
        });

        const stopRecordingEventTargetLambda = new nodeLambda.NodejsFunction(this, 'StopRecordingEventTargetLambda', {
            functionName: `${configParams['CdkAppName']}-StopRecordingEventTargetLambda`,
            runtime: lambda.Runtime.NODEJS_14_X,
            entry: 'lambdas/handlers/RecordingAPI/stopRecordingEventTarget.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                DDB_TABLE: props.appTable.tableName,
                DDB_REGION: props.cdkBackendStackRegion,
                ECS_CLUSTER_ARN: props.recordingECSClusterARN,
                ECS_CLUSTER_REGION: props.cdkBackendStackRegion
            }
        });
        props.appTable.grantReadWriteData(stopRecordingEventTargetLambda);

        stopRecordingEventTargetLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ECSStopTaskAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ecs:StopTask'],
                    resources: [`arn:aws:ecs:${props.cdkBackendStackRegion}:${this.account}:task/${props.recordingECSClusterName}/*`]
                })
            ]
        }));

        chimeMeetingEndsRule.addTarget(new events_targets.LambdaFunction(stopRecordingEventTargetLambda));
    }
}