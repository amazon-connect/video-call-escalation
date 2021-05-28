// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');
const CommonUtility = require('../lib/CommonUtility');
const AttendeeService = require('../services/AttendeeService');
const RecordingRepo = require('../repository/RecordingRepo');
const MeetingRepo = require('../repository/MeetingRepo');
const ConnectService = require('../services/ConnectService');
const S3Service = require('../services/S3Service');
const ECSClient = require("aws-sdk/clients/ecs");

const ECSClientParams = {}
if (process.env.ECS_CLUSTER_REGION) {
    ECSClientParams.region = process.env.ECS_CLUSTER_REGION
}
const ECS = new ECSClient(ECSClientParams);


const recordingECSClusterARN = process.env.ECS_CLUSTER_ARN;
const recordingContainerName = process.env.ECS_CONTAINER_NAME;
const recordingTaskDefinitionARN = process.env.ECS_TASK_DEFINITION_ARN;

const recordingBucketName = process.env.RECORDING_BUCKET_NAME;
const recordingPreSignedURLExpires = parseInt(process.env.recordingPresignedURLExpiresMinutes) * 60;

const recordingScreenWidth = process.env.RECORDING_SCREEN_WIDTH;
const recordingScreenHeight = process.env.RECORDING_SCREEN_HEIGHT;

const recordingAttendeeName = process.env.RECORDING_ATTENDEE_NAME;

const recordingECSAutoScalingGroup = process.env.ECS_ASG_NAME;

const generateRecordingFilename = (externalMeetingId, externalUserId, createdAt) => {
    const recordingFilesPrefix = `RECORDINGS/`
    const fileTimestamp = CommonUtility.getFileTimestampFromDate(createdAt);
    const datePath = CommonUtility.getPathFromDate(createdAt);

    const fileName = `${recordingFilesPrefix}${datePath}${externalMeetingId}_${externalUserId}_${fileTimestamp}.mp4`;
    return fileName;
}

const startRecording = async (externalMeetingId, connectContactId, videoRecordingPlaybackURL, meetingOwnerUsername, meetingOwnerEmail, connectUserId) => {
    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');
    if (!meetingOwnerEmail) throw new ErrorHandler(400, 'Must provide meeting owner email');
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');

    const meetingItem = await MeetingRepo.getMeetingByExternalMeetingId(externalMeetingId).catch(error => {
        console.error('getMeetingByExternalMeetingId: ', error);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    });

    if (!meetingItem) throw new ErrorHandler(404, 'Start Recording Error, meeting not found');
    if (meetingItem.ownerUsername !== meetingOwnerUsername) throw new ErrorHandler(400, 'Start Recording Error, user is not the owner');

    //check if recording already in progress
    const recordingsInProgress = await getRecordingsInProgress(externalMeetingId).catch(error => {
        console.error('getRecordingsInProgress: ', error);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    });
    if (recordingsInProgress.length > 0) {
        console.error(`recordingsInProgress.length: `, recordingsInProgress.length);
        throw new ErrorHandler(409, 'Recording already in progress');
    }

    //get ownerHierarchyGroup
    const { hierarchyGroupId: connectHierarchyGroupId, hierarchyGroupSummary: connectHierarchyGroupSummary } = await ConnectService.getUserHierarchyGroup(connectUserId).catch(error => {
        console.error('ConnectService.getUserHierarchyGroup', error);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    });

    //create RECORDING attendee
    const recordingExternalUserId = CommonUtility.uuid();
    const createdAt = new Date();

    const createAttendeeResult = await AttendeeService.createAttendee(externalMeetingId, meetingOwnerUsername, recordingExternalUserId, recordingAttendeeName).catch(error => {
        console.error('createAttendee: ', error);
        throw new ErrorHandler(500, 'Create Attendee Error, please try again later');
    });


    const chimeMeetingDataEncoded = Buffer.from(JSON.stringify(meetingItem.chimeMeetingData)).toString('base64');
    console.info(`chimeMeetingDataEncoded: `, chimeMeetingDataEncoded);
    const chimeAttendeeDataEncoded = Buffer.from(JSON.stringify(createAttendeeResult)).toString('base64');
    console.info(`chimeAttendeeDataEncoded`, chimeAttendeeDataEncoded);

    const recordingFileName = generateRecordingFilename(externalMeetingId, recordingExternalUserId, createdAt);
    const startECSRecordingTaskARN = await startECSRecordingTask(recordingExternalUserId, chimeMeetingDataEncoded, chimeAttendeeDataEncoded, recordingFileName);

    const recording = {
        recordingId: recordingExternalUserId,
        ownerUsername: meetingOwnerUsername,
        ownerEmail: meetingOwnerEmail,
        connectUserId,
        connectHierarchyGroupId,
        connectHierarchyGroupSummary,
        createdAt,
        recordingS3Bucket: recordingBucketName,
        recordingS3Object: recordingFileName,
        ecsTaskARN: startECSRecordingTaskARN
    }

    if (connectContactId && videoRecordingPlaybackURL && await isFirstRecording(externalMeetingId)) {
        await setVideoRecordingPlaybackURLContactAttribute(connectContactId, videoRecordingPlaybackURL).catch(error => {
            console.error('setVideoRecordingPlaybackURLContactAttribute: ', error);
        })
        console.info('setVideoRecordingPlaybackURLContactAttribute completed');
    }

    await RecordingRepo.putRecording(externalMeetingId, recording).catch(error => {
        console.error('putRecording: ', error);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    });

    return { recordingId: recordingExternalUserId, message: 'Start recording initiated' };
}

const startECSRecordingTask = async (recordingExternalUserId, chimeMeetingDataEncoded, chimeAttendeeDataEncoded, recordingFileName) => {

    const ecsRunTaskParams = {
        launchType: "EC2",
        cluster: recordingECSClusterARN,
        startedBy: `Recording-${recordingExternalUserId}`,
        count: 1,
        overrides: {
            containerOverrides: [{
                environment: [
                    {
                        name: "TASK_TYPE",
                        value: "RECORDING"
                    },
                    {
                        name: "CHIME_MEETING_DATA",
                        value: chimeMeetingDataEncoded
                    },
                    {
                        name: "CHIME_ATTENDEE_DATA",
                        value: chimeAttendeeDataEncoded
                    },
                    {
                        name: "RECORDING_BUCKET_NAME",
                        value: recordingBucketName
                    },
                    {
                        name: "RECORDING_FILE_NAME",
                        value: recordingFileName
                    },
                    {
                        name: "RECORDING_SCREEN_WIDTH",
                        value: recordingScreenWidth
                    },
                    {
                        name: "RECORDING_SCREEN_HEIGHT",
                        value: recordingScreenHeight
                    }
                ],
                name: recordingContainerName
            }]
        },
        taskDefinition: recordingTaskDefinitionARN
    };
    console.info(`startECSRecordingTask >> ecsRunTaskParams: `, ecsRunTaskParams);

    const runTaskResult = await ECS.runTask(ecsRunTaskParams).promise().catch(error => {
        console.error('ECS.runTask: ', error);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    });

    if (runTaskResult.failures?.length > 0) {
        console.error(`ECS.runTask failures: `, runTaskResult.failures);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    }

    if (runTaskResult.tasks.length !== 1) {
        console.error(`ECS.runTask unexpected error, : tasks.length !== 1`, runTaskResult.tasks);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    }

    const taskDesiredStatus = runTaskResult.tasks[0].desiredStatus;
    if (taskDesiredStatus !== 'RUNNING') {
        console.error(`ECS.runTask status error: taskDesiredStatus !== 'RUNNING'`, taskDesiredStatus);
        throw new ErrorHandler(500, 'Start Recording Error, please try again later');
    }

    const taskArn = runTaskResult.tasks[0].taskArn;
    return taskArn;
}

const getRecordingsInProgress = async (externalMeetingId) => {
    const recordings = await RecordingRepo.getRecordingsByExternalMeetingId(externalMeetingId);
    const recordingsInProgress = recordings.filter((i) => !i.endedAt);
    return recordingsInProgress;
}

const isFirstRecording = async (externalMeetingId) => {
    const recordings = await RecordingRepo.getRecordingsByExternalMeetingId(externalMeetingId);
    if (recordings && recordings?.length > 0) return false;
    return true;
}

const stopECSRecordingTask = async (ecsTaskARN) => {

    const ecsStopTaskParams = {
        cluster: recordingECSClusterARN,
        task: ecsTaskARN
    }

    console.info(`stopECSRecordingTask >> ecsStopTaskParams: `, ecsStopTaskParams);

    const stopTaskResult = await ECS.stopTask(ecsStopTaskParams).promise().catch(error => {
        console.error('ECS.runTask: ', error);
    });

    console.info(`ECS.stopTask Result >> `, stopTaskResult);

    const taskDesiredStatus = stopTaskResult.task?.desiredStatus;
    if (taskDesiredStatus !== 'STOPPED') {
        console.error(`ECS.stopTask status error: taskDesiredStatus !== 'STOPPED'`, taskDesiredStatus);
        return false;
    }

    return true;
}

const stopRecording = async (externalMeetingId, meetingOwnerUsername) => {
    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!meetingOwnerUsername) throw new ErrorHandler(400, 'Must provide meeting owner username');

    const recordingsInProgress = await getRecordingsInProgress(externalMeetingId);
    let recordingsStopped = [];
    let recordingsNotStopped = [];

    for (const recording of recordingsInProgress) {
        const taskStopped = await stopECSRecordingTask(recording.ecsTaskARN);
        if (taskStopped) {
            await RecordingRepo.setRecordingEndedAt(externalMeetingId, recording.recordingId).catch(error => {
                console.error(`setRecordingEndedAt: `, error);
            })
            recordingsStopped.push(recording.recordingId);

            await AttendeeService.deleteAttendee(externalMeetingId, meetingOwnerUsername, recording.recordingId).catch(error => {
                console.error(`deleteAttendee: `, error);
            });

            continue;
        }
        recordingsNotStopped.push[recording.recordingId];
    }

    return { recordingsStopped: recordingsStopped.length, recordingsNotStopped: recordingsNotStopped.length };
}

const stopRecordingEventTarget = async (externalMeetingId) => {
    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');

    const recordingsInProgress = await getRecordingsInProgress(externalMeetingId);
    let recordingsStopped = [];
    let recordingsNotStopped = [];

    for (const recording of recordingsInProgress) {
        const taskStopped = await stopECSRecordingTask(recording.ecsTaskARN);
        if (taskStopped) {
            await RecordingRepo.setRecordingEndedAt(externalMeetingId, recording.recordingId).catch(error => {
                console.error(`setRecordingEndedAt: `, error);
            })
            recordingsStopped.push(recording.recordingId);
            continue;
        }
        recordingsNotStopped.push[recording.recordingId];
    }

    return { recordingsStopped: recordingsStopped.length, recordingsNotStopped: recordingsNotStopped.length };

}

const getRecordingSummary = async (externalMeetingId, connectUserId) => {

    if (!externalMeetingId) throw new ErrorHandler(400, 'Must provide External Meeting Id');
    if (!connectUserId) throw new ErrorHandler(400, 'Must provide connectUserId');

    const {
        hierarchyGroupId: connectUserHierarchyGroupId,
        hierarchyGroupSummary: connectUserHierarchyGroupSummary,
        securityProfileIds: connectUserSecurityProfileIds
    } = await ConnectService.getConnectUserCache(connectUserId).catch(error => {
        console.error('ConnectService.getUserHierarchyGroupId', error);
        throw new ErrorHandler(500, 'Get Recording Summary Error, please try again later');
    });

    //check Connect Security Profile
    const recordingPlaybackSecurityProfileId = process.env.recordingPlaybackSecurityProfileId;
    if (!connectUserSecurityProfileIds.includes(recordingPlaybackSecurityProfileId)) {
        console.warn(`Permission denied, no call recording playback allowed`);
        throw new ErrorHandler(403, 'Get Recording Summary Error, permission denied');
    }

    const recordings = await RecordingRepo.getRecordingsByExternalMeetingId(externalMeetingId).catch(error => {
        console.error('RecordingRepo.getRecordingsByExternalMeetingId', error);
        throw new ErrorHandler(500, 'Get Recording Summary Error, please try again later');
    });

    if (!recordings?.length > 0) {
        console.warn('Recordings not found for the provided meeting');
        throw new ErrorHandler(404, 'Get Recording Summary Error, recordings not found for the provided meeting');
    }

    console.log('recordings retrieved: ', recordings);

    //check Connect Hierarchy
    const recordingsInHierarchy = recordings.filter((recording) => isInHierarchy(recording.connectHierarchyGroupId, recording.connectHierarchyGroupSummary, connectUserHierarchyGroupId, connectUserHierarchyGroupSummary));

    if (!recordingsInHierarchy?.length > 0) {
        console.warn('Permission denied, recording not in the same hierarchy');
        throw new ErrorHandler(403, 'Get Recording Summary Error, permission denied');
    }

    const recordingSummary = await generateRecordingSummaryWithPreSignedURL(recordingsInHierarchy);
    return recordingSummary.sort(CommonUtility.makeComparator('createdAt', 'asc'));

}

const setVideoRecordingPlaybackURLContactAttribute = async (connectContactId, videoRecordingPlaybackURL) => {
    if (!connectContactId) throw new ErrorHandler(400, 'Must provide Connect Contact Id');

    const videoRecordingPlaybackURLContactAttribute = {
        'videoRecordingPlaybackURL': videoRecordingPlaybackURL
    }

    await ConnectService.updateContactAttributes(connectContactId, videoRecordingPlaybackURLContactAttribute).catch(error => {
        console.error('ConnectService.updateContactAttributes: ', error);
        throw new ErrorHandler(500, 'Set VideoRecordingPlaybackURL Contact Attribute Error, please try again later');
    });
}

const generateRecordingSummaryWithPreSignedURL = (recordings) => {
    const promises = recordings.map(async (recording) => {
        return {
            recordingId: recording.recordingId,
            createdAt: recording.createdAt,
            endedAt: recording.endedAt,
            recordingURL: await S3Service.generatePreSignedURL(recording.recordingS3Bucket, recording.recordingS3Object, recordingPreSignedURLExpires)
        }
    });
    return Promise.all(promises);
}

const isInHierarchy = (recordingHierarchyGroupId, recordingHierarchyGroupSummary, connectUserHierarchyGroupId, connectUserHierarchyGroupSummary) => {

    if (recordingHierarchyGroupId === connectUserHierarchyGroupId) {
        console.info(`RecordingService >> isInHierarchy: true >> match by HierarchyGroupId`);
        return true;
    }

    if (recordingHierarchyGroupSummary && connectUserHierarchyGroupSummary) {

        const connectUserHierarchyLevel = CommonUtility.convertHierarchyLevelId(connectUserHierarchyGroupSummary.LevelId);
        if (recordingHierarchyGroupSummary.HierarchyPath[connectUserHierarchyLevel] && recordingHierarchyGroupSummary.HierarchyPath[connectUserHierarchyLevel]?.Id === connectUserHierarchyGroupId) {
            console.info(`RecordingService >> isInHierarchy: true >> match by HierarchyPath`);
            return true;
        }
    }

    console.warn(`RecordingService >> isInHierarchy: false >> no match`);
    return false;
}

const getContainerInstanceId = async (ec2InstanceId) => {
    const listContainerInstancesResult = await ECS.listContainerInstances({
        cluster: recordingECSClusterARN,
        filter: `ec2InstanceId == ${ec2InstanceId}`
    }).promise().catch(error => {
        console.error('ECS.listContainerInstances: ', error);
        throw new ErrorHandler(500, 'Start Recording Pre-Warm Task Error, please try again later');
    });

    if (listContainerInstancesResult.containerInstanceArns?.length !== 1) {
        console.error('containerInstanceId not found');
        return null
    }
    return listContainerInstancesResult.containerInstanceArns[0];
}

const startRecordingPreWarmTask = async (ec2InstanceId, autoscalingGroupName) => {
    if (!ec2InstanceId) throw new ErrorHandler(400, 'Must provide ec2InstanceARN');
    if (!autoscalingGroupName) throw new ErrorHandler(400, 'Must provide autoscalingGroupName');

    if (autoscalingGroupName !== recordingECSAutoScalingGroup) {
        console.error(`autoscalingGroupName: ${autoscalingGroupName} does not match recordingECSAutoScalingGroup: ${recordingECSAutoScalingGroup}`);
        throw new ErrorHandler(400, `Start Recording Pre-Warm Task Error, autoscalingGroupName does not match recordingECSAutoScalingGroup`);
    }

    let containerInstanceId = await getContainerInstanceId(ec2InstanceId);
    if (!containerInstanceId) {
        console.info('Retry getContainerInstanceId');
        await CommonUtility.wait(5000);
        containerInstanceId = await getContainerInstanceId(ec2InstanceId);
        if (!containerInstanceId) {
            console.error('containerInstanceId not found after retry');
            throw new ErrorHandler(500, 'Start Recording Pre-Warm Task Error, please try again later');
        }
    }

    const ecsStartTaskParams = {
        cluster: recordingECSClusterARN,
        containerInstances: [containerInstanceId],
        startedBy: `PreWarm-${ec2InstanceId}`,
        overrides: {
            containerOverrides: [{
                environment: [
                    {
                        name: "TASK_TYPE",
                        value: "PRE_WARM"
                    },
                ],
                name: recordingContainerName
            }]
        },
        taskDefinition: recordingTaskDefinitionARN
    };
    console.info(`startRecordingPreWarmTask >> ecsStartTaskParams: `, ecsStartTaskParams);

    const startTaskResult = await ECS.startTask(ecsStartTaskParams).promise().catch(error => {
        console.error('ECS.runTask: ', error);
        throw new ErrorHandler(500, 'Start Recording Pre-Warm Task Error, please try again later');
    });

    if (startTaskResult.failures?.length > 0) {
        console.error(`ECS.startTask failures: `, startTaskResult.failures);
        throw new ErrorHandler(500, 'Start Recording Pre-Warm Task Error, please try again later');
    }

    if (startTaskResult.tasks.length !== 1) {
        console.error(`ECS.startTask unexpected error, : tasks.length !== 1`, startTaskResult.tasks);
        throw new ErrorHandler(500, 'Start Recording Pre-Warm Task Error, please try again later');
    }

    const taskDesiredStatus = startTaskResult.tasks[0].desiredStatus;
    if (taskDesiredStatus !== 'RUNNING') {
        console.error(`ECS.startTask status error: taskDesiredStatus !== 'RUNNING'`, taskDesiredStatus);
        throw new ErrorHandler(500, 'Start Recording Pre-Warm Task Error, please try again later');
    }

    const taskArn = startTaskResult.tasks[0].taskArn;
    return taskArn;
}

module.exports = {
    startRecording,
    stopRecording,
    getRecordingSummary,
    stopRecordingEventTarget,
    startRecordingPreWarmTask
}