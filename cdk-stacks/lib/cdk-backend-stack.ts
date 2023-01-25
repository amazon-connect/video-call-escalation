// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as ssm from '@aws-cdk/aws-ssm';
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as ddb from '@aws-cdk/aws-dynamodb';

import { loadSSMParams } from '../lib/infrastructure/ssm-params-util';
import { CognitoStack } from '../lib/infrastructure/cognito-stack';
import { DynamoDBStack } from '../lib/infrastructure/dynamodb-stack';

import { ConnectAPIStack } from '../lib/api/connectAPI-stack';
import { ConnectAPIUpdateStack } from '../lib/api/connectAPI-update-stack';
import { ChimeAPIStack } from '../lib/api/chimeAPI-stack';
import { ChatAPIStack } from '../lib/api/chatAPI-stack';
import { MeetingAPIStack } from '../lib/api/meetingAPI-stack';
import { RoutingAPIStack } from '../lib/api/routingAPI-stack';
import { FrontendConfigStack } from '../lib/frontend/frontend-config-stack';
import { RecordingStack } from '../lib/recording/recording-stack';
import { RecordingAPIStack } from '../lib/api/recordingAPI-stack';

const configParams = require('../config.params.json');

export class CdkBackendStack extends cdk.Stack {

  public readonly webAppBucket: s3.IBucket;
  public readonly webAppCloudFrontOAI: cloudfront.IOriginAccessIdentity;
  public readonly appTable: ddb.ITable;
  public readonly recordingECSClusterARN: string;
  public readonly recordingECSClusterName: string;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //store physical stack name to SSM
    const outputHierarchy = `${configParams.hierarchy}outputParameters`;
    const cdkBackendStackName = new ssm.StringParameter(this, 'CdkBackendStackName', {
      parameterName: `${outputHierarchy}/CdkBackendStackName`,
      stringValue: this.stackName
    });

    const ssmParams = loadSSMParams(this);

    // create infrastructure stacks

    const cognitoStack = new CognitoStack(this, 'CognitoStack', {
      SSMParams: ssmParams,
      cdkAppName: configParams['CdkAppName']
    });

    const dynamodbStack = new DynamoDBStack(this, 'DynamoDBStack', {
      SSMParams: ssmParams,
      cdkAppName: configParams['CdkAppName']
    });

    //create Recording stack
    let recordingAPIEndpoint = '';
    if (ssmParams.deployRecordingStack) {
      const recordingStack = new RecordingStack(this, 'RecordingStack', {
        SSMParams: ssmParams,
        cdkAppName: configParams['CdkAppName']
      });
      this.recordingECSClusterARN = recordingStack.recordingECSClusterARN;
      this.recordingECSClusterName = recordingStack.recordingECSClusterName;

      const recordingAPIStack = new RecordingAPIStack(this, 'RecordingAPIStack', {
        SSMParams: ssmParams,
        cdkAppName: configParams['CdkAppName'],
        cognitoAuthenticatedRole: cognitoStack.authenticatedRole,
        appTable: dynamodbStack.appTable,
        recordingECSClusterARN: recordingStack.recordingECSClusterARN,
        recordingECSClusterName: recordingStack.recordingECSClusterName,
        recordingContainerName: recordingStack.recordingContainerName,
        recordingTaskDefinitionARN: recordingStack.recordingTaskDefinitionARN,
        recordingBucketName: recordingStack.recordingBucketName,
        recordingTaskDefinitionExecutionRoleARN: recordingStack.recordingTaskDefinitionExecutionRoleARN
      });

      recordingAPIStack.addDependency(recordingStack);
      recordingAPIEndpoint = recordingAPIStack.recordingAPI.apiEndpoint;

    }



    //create API stacks
    const connectAPIStack = new ConnectAPIStack(this, 'ConnectAPIStack', {
      SSMParams: ssmParams,
      cognitoAuthenticatedRole: cognitoStack.authenticatedRole,
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      cognitoUserPoolARN: cognitoStack.userPool.userPoolArn,
      appTable: dynamodbStack.appTable,
      cdkAppName: configParams['CdkAppName'],
    });
    connectAPIStack.addDependency(cognitoStack);

    const connectAPIUpdateStack = new ConnectAPIUpdateStack(this, 'connectAPIUpdateStack', {
      ccpLambdaRoleArn: connectAPIStack.ccpLambdaRoleArn
    });
    connectAPIUpdateStack.addDependency(connectAPIStack);


    const chimeAPIStack = new ChimeAPIStack(this, 'ChimeAPIStack', {
      SSMParams: ssmParams,
      cognitoAuthenticatedRole: cognitoStack.authenticatedRole,
      appTable: dynamodbStack.appTable,
      cdkAppName: configParams['CdkAppName']
    });
    chimeAPIStack.addDependency(cognitoStack);
    chimeAPIStack.addDependency(dynamodbStack);

    const chatAPIStack = new ChatAPIStack(this, 'ChatAPIStack', {
      SSMParams: ssmParams,
      appTable: dynamodbStack.appTable,
      cdkAppName: configParams['CdkAppName']
    });
    chatAPIStack.addDependency(dynamodbStack);

    const meetingAPIStack = new MeetingAPIStack(this, 'MeetingAPIStack', {
      SSMParams: ssmParams,
      getAttendeeNameLambda: chimeAPIStack.getAttendeeNameLambda,
      getAttendeeJoinDataLambda: chimeAPIStack.getAttendeeJoinDataLambda,
      cdkAppName: configParams['CdkAppName']
    });
    meetingAPIStack.addDependency(chimeAPIStack);

    const routingAPIStack = new RoutingAPIStack(this, 'RoutingAPIStack', {
      SSMParams: ssmParams,
      cognitoAuthenticatedRole: cognitoStack.authenticatedRole,
      appTable: dynamodbStack.appTable,
      cdkAppName: configParams['CdkAppName']
    });
    routingAPIStack.addDependency(cognitoStack);
    routingAPIStack.addDependency(dynamodbStack);

    //create webapp bucket
    const webAppBucket = new s3.Bucket(this, "WebAppBucket", {
      bucketName: `${configParams['CdkAppName']}-WebAppBucket-${this.account}-${this.region}`.toLowerCase(),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const webAppCloudFrontOAI = new cloudfront.OriginAccessIdentity(this, `${configParams['CdkAppName']}-WebAppOAI`,);

    //create frontend config
    const frontendConfigStack = new FrontendConfigStack(this, 'FrontendConfigStack', {
      cdkAppName: configParams['CdkAppName'],
      webAppBucket: webAppBucket,
      backendStackOutputs: [
        { key: 'identityPoolId', value: cognitoStack.identityPool.ref },
        { key: 'userPoolId', value: cognitoStack.userPool.userPoolId },
        { key: 'userPoolWebClientId', value: cognitoStack.userPoolClient.userPoolClientId },
        { key: 'cognitoDomainURL', value: `https://${cognitoStack.userPoolDomain.domain}.auth.${this.region}.amazoncognito.com` },
        { key: 'connectAPI', value: `${connectAPIStack.connectAPI.apiEndpoint}/` },
        { key: 'chimeAPI', value: `${chimeAPIStack.chimeAPI.apiEndpoint}/` },
        { key: 'meetingAPI', value: `${meetingAPIStack.meetingAPI.apiEndpoint}/` },
        { key: 'chatAPI', value: `${chatAPIStack.chatAPI.apiEndpoint}/` },
        { key: 'routingAPI', value: `${routingAPIStack.routingAPI.apiEndpoint}/` },
        { key: 'recordingAPI', value: `${recordingAPIEndpoint}/` },
        { key: 'backendRegion', value: this.region },
        { key: 'connectInstanceARN', value: ssmParams.connectInstanceARN },
        { key: 'connectInstanceURL', value: ssmParams.connectInstanceURL },
        { key: 'cognitoSAMLEnabled', value: String(ssmParams.cognitoSAMLEnabled) },
        { key: 'cognitoSAMLIdentityProviderName', value: ssmParams.cognitoSAMLIdentityProviderName },
        { key: 'connectDefaultContactFlowId', value: ssmParams.connectDefaultContactFlowId },
        { key: 'websiteAdHocRouteBaseURL', value: ssmParams.websiteAdHocRouteBaseURL },
        { key: 'deployRecordingStack', value: String(ssmParams.deployRecordingStack) },
        { key: 'recordingAttendeeName', value: ssmParams.recordingAttendeeName }
      ]
    });
    frontendConfigStack.addDependency(cognitoStack);
    frontendConfigStack.addDependency(connectAPIStack);
    frontendConfigStack.addDependency(chimeAPIStack);
    frontendConfigStack.addDependency(meetingAPIStack);
    frontendConfigStack.addDependency(chatAPIStack);
    frontendConfigStack.addDependency(routingAPIStack);

    /**************************************************************************************************************
      * CDK Outputs *
    **************************************************************************************************************/

    this.webAppBucket = webAppBucket;
    this.webAppCloudFrontOAI = webAppCloudFrontOAI;
    this.appTable = dynamodbStack.appTable;

    new cdk.CfnOutput(this, "userPoolId", {
      value: cognitoStack.userPool.userPoolId
    });

    new cdk.CfnOutput(this, "ccpLoginRoleName", {
      value: connectAPIStack.ccpLambdaRoleName || ''
    });

    new cdk.CfnOutput(this, "ccpLoginRoleArn", {
      value: connectAPIStack.ccpLambdaRoleArn || ''
    });
  }
}
