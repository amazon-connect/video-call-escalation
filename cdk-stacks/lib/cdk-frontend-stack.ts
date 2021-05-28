// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "@aws-cdk/core";
import * as ssm from '@aws-cdk/aws-ssm'
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";

import { FrontendS3DeploymentStack } from '../lib/frontend/frontend-s3-deployment-stack';

const configParams = require('../config.params.json')
export interface CdkFrontendStackProps extends cdk.StackProps {
    readonly webAppBucket: s3.IBucket;
    readonly webAppCloudFrontOAI: cloudfront.IOriginAccessIdentity;
}

export class CdkFrontendStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: CdkFrontendStackProps) {
        super(scope, id, props);

        //store physical stack name to SSM
        const outputHierarchy = `${configParams.hierarchy}outputParameters`;
        const cdkFrontendStackName = new ssm.StringParameter(this, 'CdkFrontendStackName', {
            parameterName: `${outputHierarchy}/CdkFrontendStackName`,
            stringValue: this.stackName
        });

        const frontendS3DeploymentStack = new FrontendS3DeploymentStack(this, 'FrontendS3DeploymentStack', {
            cdkAppName: configParams['CdkAppName'],
            webAppBucket: props.webAppBucket
        });



        const webAppCloudFrontDistribution = new cloudfront.CloudFrontWebDistribution(this, `${configParams['CdkAppName']}-WebAppDistribution`, {
            comment: `CloudFront for ${configParams['CdkAppName']}`,
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: props.webAppBucket,
                        originPath: `/${configParams['WebAppRootPrefix'].replace(/\/$/, "")}`,
                        originAccessIdentity: props.webAppCloudFrontOAI,
                    },
                    behaviors: [
                        {
                            defaultTtl: cdk.Duration.minutes(1),
                            isDefaultBehavior: true,
                        },
                    ]
                }
            ],
            errorConfigurations: [{
                errorCode: 403,
                errorCachingMinTtl: 60,
                responsePagePath: '/index.html',
                responseCode: 200
            }]
        });

        /**************************************************************************************************************
         * CDK Outputs *
         **************************************************************************************************************/

        new cdk.CfnOutput(this, "webAppBucket", {
            value: props.webAppBucket.bucketName
        });

        new cdk.CfnOutput(this, "webAppURL", {
            value: `https://${webAppCloudFrontDistribution.distributionDomainName}`
        });
    }
}