#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkBackendStack } from '../lib/cdk-backend-stack';

const app = new cdk.App();
new CdkBackendStack(app, 'VideoCallEscalationStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }
});
