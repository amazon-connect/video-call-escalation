// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import { CdkBackendStack } from '../cdk-backend-stack';
import { CdkFrontendStack } from '../cdk-frontend-stack';
const configParams = require('../../config.params.json');
import { CdkChimeEventBridgeStack } from '../recording/cdk-chime-event-bridge-stack';

export interface CdkPipelineStageProps extends cdk.StackProps {
    readonly deployRecordingStack: boolean
}

export class CdkPipelineStage extends cdk.Stage {
    constructor(scope: cdk.Construct, id: string, props: CdkPipelineStageProps) {
        super(scope, id, props);

        const cdkBackendStack = new CdkBackendStack(this, configParams['CdkBackendStack']);

        if (props.deployRecordingStack) {
            const cdkChimeEventBridgeStack = new CdkChimeEventBridgeStack(this, configParams['CdkChimeEventBridgeStack'], {
                env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
                cdkBackendStackRegion: cdkBackendStack.region,
                appTable: cdkBackendStack.appTable,
                recordingECSClusterARN: cdkBackendStack.recordingECSClusterARN,
                recordingECSClusterName: cdkBackendStack.recordingECSClusterName
            });
            cdkChimeEventBridgeStack.addDependency(cdkBackendStack);
        }

        const cdkFrontendStack = new CdkFrontendStack(this, configParams['CdkFrontendStack'], {
            webAppBucket: cdkBackendStack.webAppBucket,
            webAppCloudFrontOAI: cdkBackendStack.webAppCloudFrontOAI
        });
        cdkFrontendStack.addDependency(cdkBackendStack);
    }
}