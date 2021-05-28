// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as ssm from '@aws-cdk/aws-ssm';
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as pipelines from "@aws-cdk/pipelines";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import { loadSSMParams, fixDummyValueString } from '../infrastructure/ssm-params-util';
import { CdkPipelineStage } from '../pipeline/cdk-pipeline-stage';

const configParams = require('../../config.params.json');

export class CdkPipelineStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const outputHierarchy = `${configParams.hierarchy}outputParameters`;

        const ssmParams = loadSSMParams(this);

        /**
        *** STEP 1: CREATE A CODECOMMIT REPO _OR_ IMPORT FROM AN EXISTING ONE   ***
        **/
        let repository: codecommit.IRepository;

        if (ssmParams.cdkPipelineCreateNewRepository) {
            repository = new codecommit.Repository(this, `${configParams['CdkAppName']}-Repository`, {
                repositoryName: ssmParams.cdkPipelineRepositoryName
            });

            // *** CREATE AN IAM USER WITH CREDENTIALS TO THE CODECOMMIT REPO ***
            const repositoryUser = new iam.User(this, `${configParams['CdkAppName']}-RepositoryUser`, {
                userName: `codecommit-user-${ssmParams.cdkPipelineRepositoryName}`
            });

            repositoryUser.addToPolicy(
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [repository.repositoryArn],
                    actions: ["codecommit:GitPull", "codecommit:GitPush"],
                })
            );

            // *** STORE OUTPUTS FROM IAM FOR SETTING UP REPOSITORY MIRRORING ***

            const repositoryUsername = new ssm.StringParameter(this, 'RepositoryUsername', {
                parameterName: `${outputHierarchy}/RepositoryUsername`,
                stringValue: repositoryUser.userName,
                description: `The username created to access the CodeCommit repo. The username & password of this user should be used for repository mirroring.`
            });

            const repositoryUserURL = new ssm.StringParameter(this, 'RepositoryUserURL', {
                parameterName: `${outputHierarchy}/RepositoryUserURL`,
                stringValue: `https://console.aws.amazon.com/iam/home?region=${this.region}#/users/${repositoryUser.userName}?section=security_credentials`,
                description: `URL of the page where you should create the HTTPS Git credentials for AWS CodeCommit. The username & password should then be used for repository mirroring.`
            });

            const repositoryURL = new ssm.StringParameter(this, 'RepositoryURL', {
                parameterName: `${outputHierarchy}/RepositoryURL`,
                stringValue: `https://${repositoryUser.userName}-at-${this.account}@git-codecommit.${this.region}.amazonaws.com/v1/repos/${repository.repositoryName}`,
                description: `Use this URL for your repository mirroring`
            });
        }
        else {
            // *** IMPORT A REPOSITORY ***
            // This imports an existing CodeCommit repository (if you have created it already)
            repository = codecommit.Repository.fromRepositoryName(this, `${configParams['CdkAppName']}-Repository`, ssmParams.cdkPipelineRepositoryName);
        }

        /**
        *** STEP 2: SET UP A CDK PIPELINE  ***
        **/
        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const cdkPipeline = new pipelines.CdkPipeline(this, `${configParams['CdkAppName']}-Pipeline`, {
            pipelineName: `${configParams['CdkAppName']}-Pipeline`,
            cloudAssemblyArtifact: cloudAssemblyArtifact,
            sourceAction: new codepipeline_actions.CodeCommitSourceAction({
                actionName: 'CodeCommit',
                output: sourceArtifact,
                repository: repository,
                branch: ssmParams.cdkPipelineRepositoryBranchName
            }),
            synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
                sourceArtifact: sourceArtifact,
                cloudAssemblyArtifact: cloudAssemblyArtifact,
                subdirectory: 'cdk-stacks',
                installCommand: 'npm run install:all',
                buildCommand: 'npm run build:frontend',
                synthCommand: 'npm run cdk:remove:context && npx cdk synth',
                rolePolicyStatements: [
                    new iam.PolicyStatement({
                        actions: ["ssm:GetParameter"],
                        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${configParams.hierarchy}*`]
                    }),
                    new iam.PolicyStatement({
                        actions: ["ec2:DescribeAvailabilityZones"],
                        resources: ["*"]
                    })
                ]
            })
        });

        /* *** DEFINE APPLICATION STAGES ****   */

        cdkPipeline.addApplicationStage(new CdkPipelineStage(this, fixDummyValueString(`${configParams['CdkAppName']}-${ssmParams.cdkPipelineStageName}`), {
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region: process.env.CDK_DEFAULT_REGION
            },
            deployRecordingStack: ssmParams.deployRecordingStack
        }));
    }

}