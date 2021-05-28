// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const RecordingService = require('../../services/RecordingService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const autoscalingGroupName = event.detail?.AutoScalingGroupName;
        const ec2InstanceId = event.detail?.EC2InstanceId;

        const startRecordingPreWarmTaskResult = await RecordingService.startRecordingPreWarmTask(ec2InstanceId, autoscalingGroupName);
        console.info('Start Recording Pre-Warm Task result: ', startRecordingPreWarmTaskResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Start Recording Pre-Warm Task succeed!', data: startRecordingPreWarmTaskResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}