// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import { CdkBackendStack } from '../cdk-backend-stack';
import { CdkFrontendStack } from '../cdk-frontend-stack';
const configParams = require('../../config.params.json');

export class CdkPipelineStage extends cdk.Stage {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const cdkBackendStack = new CdkBackendStack(this, configParams['CdkBackendStack']);

        const cdkFrontendStack = new CdkFrontendStack(this, configParams['CdkFrontendStack'], {
            webAppBucket: cdkBackendStack.webAppBucket,
            webAppCloudFrontOAI: cdkBackendStack.webAppCloudFrontOAI
        });
        cdkFrontendStack.addDependency(cdkBackendStack);
    }
}