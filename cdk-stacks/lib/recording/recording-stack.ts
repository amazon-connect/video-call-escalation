// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from "@aws-cdk/aws-ecs";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as logs from "@aws-cdk/aws-logs";
import * as ecr_assets from "@aws-cdk/aws-ecr-assets";
import * as path from "path";
import * as s3 from "@aws-cdk/aws-s3";

import * as events from "@aws-cdk/aws-events";
import * as events_targets from "@aws-cdk/aws-events-targets";
import * as lambda from '@aws-cdk/aws-lambda';
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as iam from '@aws-cdk/aws-iam';

export interface RecordingStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cdkAppName: string;
}

export class RecordingStack extends cdk.NestedStack {
    public readonly recordingECSClusterARN: string;
    public readonly recordingECSClusterName: string;
    public readonly recordingContainerName: string;
    public readonly recordingTaskDefinitionARN: string;
    public readonly recordingBucketName: string;
    public readonly recordingTaskDefinitionExecutionRoleARN: string;


    constructor(scope: cdk.Construct, id: string, props: RecordingStackProps) {
        super(scope, id, props);

        /** CREATE AN AMAZON VPC FOR THE AMAZON ECS CLUSTER **/
        const recordingVPC = new ec2.Vpc(this, 'RecordingVPC', {
            maxAzs: 2, //default is 3
            cidr: '10.5.0.0/16',
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: `${props.cdkAppName}-private-`,
                    subnetType: ec2.SubnetType.PRIVATE
                },
                {
                    cidrMask: 24,
                    name: `${props.cdkAppName}-public-`,
                    subnetType: ec2.SubnetType.PUBLIC
                },
            ]

        });

        /** CREATE SECURITY GROUPS **/
        const recordingECSSecurityGroup = new ec2.SecurityGroup(this, 'RecordingECSSecurityGroup', {
            securityGroupName: `${props.cdkAppName}-RecordingECSSecurityGroup`,
            vpc: recordingVPC,
            description: `ECS Security Group for ${props.cdkAppName} Recording ECS Cluster`,
            allowAllOutbound: true
        });

        /** CREATE AN ECS CLUSTER **/
        const recordingECSCluster = new ecs.Cluster(this, 'RecordingECSCluster', {
            vpc: recordingVPC,
            clusterName: `${props.cdkAppName}-Recording`,
            containerInsights: true,
        });


        /** CREATE AN AUTOSCALING GROUP FOR ECS CLUSTER INSTANCES **/
        const recordingECSAutoScalingGroup = new autoscaling.AutoScalingGroup(this, "RecordingECSAutoScalingGroup", {
            vpc: recordingVPC,
            securityGroup: recordingECSSecurityGroup,
            allowAllOutbound: true,
            associatePublicIpAddress: false,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE2),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE
            },
            minCapacity: 1,
            maxCapacity: 5,
            signals: autoscaling.Signals.waitForMinCapacity({
                timeout: cdk.Duration.minutes(15)
            }),
            updatePolicy: autoscaling.UpdatePolicy.replacingUpdate()
        });

        const recordingECSAutoScalingGroupCFN = recordingECSAutoScalingGroup.node.defaultChild as autoscaling.CfnAutoScalingGroup;
        const recordingECSAutoScalingGroupCFNLogicalId = "RecordingECSAutoScalingGroup";
        recordingECSAutoScalingGroupCFN.overrideLogicalId(recordingECSAutoScalingGroupCFNLogicalId); //LOGICAL ID FOR CFN SIGNAL

        recordingECSAutoScalingGroup.addUserData(
            `#!/bin/bash -xe`,
            `echo ECS_CLUSTER=${recordingECSCluster.clusterName} >> /etc/ecs/ecs.config`,
            `echo ECS_IMAGE_PULL_BEHAVIOR=prefer-cached >> /etc/ecs/ecs.config`,
            `yum install -y aws-cfn-bootstrap`,
            `/opt/aws/bin/cfn-signal -e $? --stack ${this.stackName} --resource ${recordingECSAutoScalingGroupCFNLogicalId} --region ${this.region}`
        );

        const recordingECSCapacityProvider = new ecs.AsgCapacityProvider(this, 'RecordingECSCapacityProvider', {
            autoScalingGroup: recordingECSAutoScalingGroup,
            enableManagedScaling: true,
            minimumScalingStepSize: 1,
            maximumScalingStepSize: 2,
            targetCapacityPercent: 60
        });

        recordingECSCluster.addAsgCapacityProvider(recordingECSCapacityProvider);


        /* DEFINE A TASK DEFINITION FOR ECS TASKS RUNNING IN THE CLUSTER */

        const recordingTaskDefinition = new ecs.TaskDefinition(this, "RecordingTaskDefinition", {
            compatibility: ecs.Compatibility.EC2,
            volumes: [{
                name: "dbus",
                host: {
                    sourcePath: "/run/dbus/system_bus_socket:/run/dbus/system_bus_socket"
                }
            }]
        });

        const recordingTaskLogGroup = new logs.LogGroup(this, "RecordingTaskLogGroup", {
            retention: logs.RetentionDays.TWO_MONTHS,
            logGroupName: `${props.cdkAppName}-RecordingTask`,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // BUILD A DOCKER IMAGE AND UPLOAD IT TO AN ECR REPOSITORY

        const recordingDockerImage = new ecr_assets.DockerImageAsset(this, "RecordingDockerImage", {
            directory: path.join(__dirname, "../../docker/recording")
        });

        recordingDockerImage.repository.grantPull(recordingTaskDefinition.obtainExecutionRole()); //add permissions to pull ecr repository

        // CREATE A TASK DEFINITION
        const recordingContainerName = `${props.cdkAppName}-RecordingContainer`;
        recordingTaskDefinition.addContainer(recordingContainerName, {
            image: ecs.EcrImage.fromRegistry(recordingDockerImage.imageUri),
            cpu: 4096,
            memoryLimitMiB: 8192,
            memoryReservationMiB: 8192,
            linuxParameters: new ecs.LinuxParameters(this, "RecordingTaskLinuxParameters", { sharedMemorySize: 2048 }),
            essential: true,
            logging: ecs.LogDriver.awsLogs({
                logGroup: recordingTaskLogGroup,
                streamPrefix: `${props.cdkAppName}`
            })
        });

        //Amazon S3 bucket to store the call recordings
        const recordingBucket = new s3.Bucket(this, "RecordingBucket", {
            bucketName: `${props.cdkAppName}-RecordingBucket-${this.account}-${this.region}`.toLowerCase(),
            encryption: s3.BucketEncryption.KMS_MANAGED
        });

        recordingBucket.grantReadWrite(recordingTaskDefinition.taskRole);


        //pre-warm task
        const autoscalingEC2InstanceLaunchRule = new events.Rule(this, 'AutoscalingEC2InstanceLaunchRule', {
            description: `Rule triggered by recordingECSAutoScalingGroup when a new EC2 instance is launched`,
            eventPattern: {
                source: ['aws.autoscaling'],
                detailType: ['EC2 Instance Launch Successful'],
                detail: {
                    'AutoScalingGroupName': [recordingECSAutoScalingGroup.autoScalingGroupName]
                }
            }
        });

        const startRecordingPreWarmTaskLambda = new nodeLambda.NodejsFunction(this, 'StartRecordingPreWarmTaskLambda', {
            functionName: `${props.cdkAppName}-StartRecordingPreWarmTaskLambda`,
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: 'lambdas/handlers/RecordingAPI/startRecordingPreWarmTask.js',
            timeout: cdk.Duration.seconds(20),
            environment: {
                ECS_CLUSTER_ARN: recordingECSCluster.clusterArn,
                ECS_CONTAINER_NAME: recordingContainerName,
                ECS_TASK_DEFINITION_ARN: recordingTaskDefinition.taskDefinitionArn,
                ECS_ASG_NAME: recordingECSAutoScalingGroup.autoScalingGroupName
            }
        });

        startRecordingPreWarmTaskLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ECSListContainerInstancesAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ecs:ListContainerInstances'],
                    resources: [recordingECSCluster.clusterArn]
                })
            ]
        }));

        startRecordingPreWarmTaskLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ECSStartTaskAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ecs:StartTask'],
                    resources: [recordingTaskDefinition.taskDefinitionArn]
                })
            ]
        }));

        startRecordingPreWarmTaskLambda.role?.attachInlinePolicy(new iam.Policy(this, 'IAMPassRoleAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:PassRole'],
                    resources: [recordingTaskDefinition.executionRole?.roleArn!]
                })
            ]
        }));

        autoscalingEC2InstanceLaunchRule.addTarget(new events_targets.LambdaFunction(startRecordingPreWarmTaskLambda));


        //outputs
        this.recordingECSClusterARN = recordingECSCluster.clusterArn;
        this.recordingECSClusterName = recordingECSCluster.clusterName;
        this.recordingContainerName = recordingContainerName;
        this.recordingTaskDefinitionARN = recordingTaskDefinition.taskDefinitionArn;
        this.recordingBucketName = recordingBucket.bucketName;
        this.recordingTaskDefinitionExecutionRoleARN = recordingTaskDefinition.executionRole?.roleArn!;
    }

}