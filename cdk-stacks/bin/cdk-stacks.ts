#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm')
const ssmClient = new SSMClient()
import { CdkBackendStack } from '../lib/cdk-backend-stack';
import { CdkFrontendStack } from '../lib/cdk-frontend-stack';
import { CdkPipelineStack } from '../lib/pipeline/cdk-pipeline-stack';
import { CdkChimeEventBridgeStack } from '../lib/recording/cdk-chime-event-bridge-stack';

const configParams = require('../config.params.json');

const app = new cdk.App();

const deployWithPipeline = () => {
    console.log("Running in pipeline mode...");
    const cdkPipelineStack = new CdkPipelineStack(app, configParams['CdkPipelineStack'], {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
    });
}

const deployWithoutPipeline = () => {
    console.log("Running in stack mode...");
    const cdkBackendStack = new CdkBackendStack(app, configParams['CdkBackendStack'], {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
    });

    const cdkFrontendStack = new CdkFrontendStack(app, configParams['CdkFrontendStack'], {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
        webAppBucket: cdkBackendStack.webAppBucket,
        webAppCloudFrontOAI: cdkBackendStack.webAppCloudFrontOAI
    });
    cdkFrontendStack.addDependency(cdkBackendStack);

    isDeployRecordingStack().then((isDeployRecordingStack) => {
        if (isDeployRecordingStack) {
            const cdkChimeEventBridgeStack = new CdkChimeEventBridgeStack(app, configParams['CdkChimeEventBridgeStack'], {
                env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
                cdkBackendStackRegion: cdkBackendStack.region,
                appTable: cdkBackendStack.appTable,
                recordingECSClusterARN: cdkBackendStack.recordingECSClusterARN,
                recordingECSClusterName: cdkBackendStack.recordingECSClusterName
            });
            cdkChimeEventBridgeStack.addDependency(cdkBackendStack);
        }
    });

}

const isCdkPipelineEnabled = async () => {
    const cdkPipelineEnabled = await ssmClient.send(new GetParameterCommand({ Name: `${configParams.hierarchy}cdkPipelineEnabled` })).catch((error: Error) => {
        console.error(error);
        throw new Error(`Error loading SSM Parameter: [cdkPipelineEnabled]`);
    });
    return cdkPipelineEnabled.Parameter.Value.toLowerCase() === "true";
}

const isDeployRecordingStack = async () => {
    const deployRecordingStack = await ssmClient.send(new GetParameterCommand({ Name: `${configParams.hierarchy}deployRecordingStack` })).catch((error: Error) => {
        console.error(error);
        throw new Error(`Error loading SSM Parameter: [deployRecordingStack]`);
    });
    return deployRecordingStack.Parameter.Value.toLowerCase() === "true";
}


isCdkPipelineEnabled().then((cdkPipelineEnabled) => {
    if (cdkPipelineEnabled) deployWithPipeline();
    else deployWithoutPipeline();
});

