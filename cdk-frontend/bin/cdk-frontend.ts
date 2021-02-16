#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkFrontendStack } from '../lib/cdk-frontend-stack';

const app = new cdk.App();
new CdkFrontendStack(app, 'VideoCallEscalationFrontendStack', {
    // env : {
    //     region: 'us-west-2'
    // }
});
