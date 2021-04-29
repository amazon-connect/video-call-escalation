// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from "@aws-cdk/aws-s3";

const configParams = require('../../config.params.json');

export interface FrontendConfigStackProps extends cdk.NestedStackProps {
    readonly backendStackOutputs: { key: string, value: string }[];
    readonly webAppBucket: s3.IBucket;
    readonly cdkAppName: string;
}

export class FrontendConfigStack extends cdk.NestedStack {

    constructor(scope: cdk.Construct, id: string, props: FrontendConfigStackProps) {
        super(scope, id, props);

        const buildConfigParameters = () => {
            const result: any = {};
            props.backendStackOutputs.forEach(param => {
                result[param.key] = param.value;
            });
            return JSON.stringify(result);
        }

        //frontend config custom resource
        const frontendConfigLambda = new lambda.Function(this, `FrontendConfigLambda`, {
            functionName: `${props.cdkAppName}-FrontendConfigLambda`,
            runtime: lambda.Runtime.PYTHON_3_8,
            code: lambda.Code.fromAsset('lambdas/custom-resources/frontend-config'),
            handler: 'index.handler',
            timeout: cdk.Duration.seconds(120),
            initialPolicy: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["s3:PutObject", "s3:DeleteObject"],
                resources: [
                    `${props.webAppBucket.bucketArn}/${configParams['WebAppStagingPrefix']}frontend-config.zip`,
                    `${props.webAppBucket.bucketArn}/${configParams['WebAppRootPrefix']}frontend-config.js`
                ]
            })]
        });

        const frontendConfigCustomResource = new cdk.CustomResource(this, `${props.cdkAppName}-FrontendConfigCustomResource`, {
            resourceType: 'Custom::FrontendConfig',
            serviceToken: frontendConfigLambda.functionArn,
            properties: {
                BucketName: props.webAppBucket.bucketName,
                WebAppStagingObjectPrefix: configParams['WebAppStagingPrefix'],
                WebAppRootObjectPrefix: configParams['WebAppRootPrefix'],
                ObjectKey: `frontend-config.js`,
                ContentType: 'text/javascript',
                Content: `window.vceConfig = ${buildConfigParameters()}`
            }
        });
    }
}