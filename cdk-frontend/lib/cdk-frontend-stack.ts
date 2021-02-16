// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3deployment from "@aws-cdk/aws-s3-deployment"

export class CdkFrontendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const webAppBucket = new s3.Bucket(this, "VideoCallEscalationWebApp", {
      removalPolicy : cdk.RemovalPolicy.DESTROY
    });

    const agentAppDeployment = new s3deployment.BucketDeployment(this, "VideoCallEscalationAgentAppDeployment", {
      destinationBucket : webAppBucket,
      retainOnDelete : false,
      sources : [s3deployment.Source.asset('../agent-app/build'), s3deployment.Source.asset('../demo-website/build')]
    })

    const webAppCloudFrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "VideoCallEscalationWebAppOAI"
    );

    const webAppCloudFrontDistribution = new cloudfront.CloudFrontWebDistribution(this, "VideoCallEscalationWebAppDistribution", {
        comment: "CloudFront for VideoCallEscalation",
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: webAppBucket,
              originAccessIdentity: webAppCloudFrontOAI,
            },
            behaviors: [
              {
                defaultTtl: cdk.Duration.minutes(1),
                isDefaultBehavior: true,
              },
            ],
          },
        ],
      }
    );

    webAppBucket.grantRead(webAppCloudFrontOAI.grantPrincipal);

    /**************************************************************************************************************
     * CDK Outputs *
     **************************************************************************************************************/

    new cdk.CfnOutput(this, "webAppBucket", {
      value: webAppBucket.bucketName,
    });

    new cdk.CfnOutput(this, "webAppURL", {
      value: webAppCloudFrontDistribution.distributionDomainName
    });

  }
}
