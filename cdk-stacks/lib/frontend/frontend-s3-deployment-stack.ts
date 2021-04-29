// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as s3deployment from "@aws-cdk/aws-s3-deployment";
import * as s3 from "@aws-cdk/aws-s3";

const configParams = require('../../config.params.json');

export interface FrontendS3DeploymentStackProps extends cdk.NestedStackProps {
    readonly cdkAppName: string;
    readonly webAppBucket: s3.IBucket;
}

export class FrontendS3DeploymentStack extends cdk.NestedStack {

    public readonly webAppBucket: s3.IBucket;

    constructor(scope: cdk.Construct, id: string, props: FrontendS3DeploymentStackProps) {
        super(scope, id, props);

        const agentAppDeployment = new s3deployment.BucketDeployment(this, `${props.cdkAppName}-AgentAppDeployment`, {
            destinationBucket: props.webAppBucket,
            retainOnDelete: false,
            destinationKeyPrefix: configParams['WebAppRootPrefix'],
            sources: [
                s3deployment.Source.asset('../agent-app/build'),
                s3deployment.Source.asset('../demo-website/build'),
                s3deployment.Source.bucket(props.webAppBucket, `${configParams['WebAppStagingPrefix']}frontend-config.zip`)
            ]
        });
    }
}