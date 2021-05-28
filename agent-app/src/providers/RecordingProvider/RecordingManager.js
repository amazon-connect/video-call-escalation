// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { RecordingStatus } from '../../constants';
import { startRecording as startRecordingAPI, stopRecording as stopRecordingAPI } from '../../apis/recordingAPI';
import { infoMessage, errorMessage, rejectMessage } from '../../utils/NotificationUtility';
import routes from '../../constants/routes';

export class RecordingManager {

    externalMeetingId = '';
    connectContactId = '';

    recordingStatus = RecordingStatus.NOT_STARTED;
    attendeePresent = false;

    deployRecordingStackConfig = false;
    recordingAttendeeNameConfig = false;

    videoRecordingStartStopEnabled = false;
    videoRecordingAutoStartEnabled = false;

    recordingStatusObservers = [];

    constructor(config) {
        console.info(`RecordingManager >> constructor >> config: `, config);
        this.deployRecordingStackConfig = config.deployRecordingStack;
        this.recordingAttendeeNameConfig = config.recordingAttendeeName;
    }

    toggleRecordingEnabled = (() => this.deployRecordingStackConfig && this.videoRecordingStartStopEnabled);
    shouldMonitorMeetingRoster = (() => this.deployRecordingStackConfig && (this.videoRecordingStartStopEnabled || this.videoRecordingAutoStartEnabled));
    shouldAutoStartRecording = (() => this.deployRecordingStackConfig && this.videoRecordingAutoStartEnabled);

    initRecordingStatus = (externalMeetingId, connectContactId) => {
        this.recordingStatus = RecordingStatus.NOT_STARTED;
        this.attendeePresent = false;
        this.externalMeetingId = externalMeetingId;
        this.connectContactId = connectContactId;
    }

    setRecordingFeatures = ({
        videoRecordingAutoStartEnabled = false,
        videoRecordingStartStopEnabled = false,
    }) => {
        this.videoRecordingStartStopEnabled = videoRecordingStartStopEnabled;
        this.videoRecordingAutoStartEnabled = videoRecordingAutoStartEnabled;
    }

    canStartRecording = () => {
        if (this.recordingStatus === RecordingStatus.NOT_STARTED || this.recordingStatus === RecordingStatus.STOPPED || this.recordingStatus === RecordingStatus.STARTING_FAILED) return true;
        return false;
    }

    canStopRecording = () => {
        if (this.recordingStatus === RecordingStatus.STARTED || this.recordingStatus === RecordingStatus.STOPPING_FAILED || this.recordingStatus === RecordingStatus.STOPPING_UNKNOWN) return true;
        return false;
    }

    startRecording = async (suppressInfo = false) => {
        if (!this.canStartRecording()) {
            console.warn(`RecordingProvider >> Unable to start recording: `, this.recordingStatus);
            return this.publishAndReturn(errorMessage(`Unable to start recording at this time`));
        }
        const videoRecordingPlaybackURL = `${window.location.protocol}//${window.location.host}${routes.RECORDING}/${this.externalMeetingId}`;
        const startRecordingResult = await startRecordingAPI(this.externalMeetingId, this.connectContactId, videoRecordingPlaybackURL).catch(error => {
            console.error(`RecordingProvider >> startRecording failed: `, error);
            return { error };
        });
        if (startRecordingResult.error) {
            this.recordingStatus = RecordingStatus.STARTING_FAILED;
            return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STARTING_FAILED));
        }
        this.recordingStatus = RecordingStatus.STARTING;
        return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STARTING), suppressInfo);
    }

    stopRecording = async (suppressInfo = false) => {
        if (!this.canStopRecording()) {
            console.warn(`RecordingProvider >> Unable to stop recording: `, this.recordingStatus);
            return this.publishAndReturn(errorMessage(`Unable to stop recording at this time`));
        }
        const stopRecordingResult = await stopRecordingAPI(this.externalMeetingId).catch(error => {
            console.error(`RecordingProvider >> stopRecordingFailed: `, error);
            return { error };
        });
        if (stopRecordingResult.error) {
            this.recordingStatus = RecordingStatus.STOPPING_FAILED;
            return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STOPPING_FAILED));
        }

        const { recordingsStopped, recordingsNotStopped } = stopRecordingResult;

        console.info(`RecordingProvider >> recordingsStopped: ${recordingsStopped} and recordingsNotStopped: ${recordingsNotStopped}`);

        if (recordingsStopped > 0 && recordingsNotStopped === 0) {
            this.recordingStatus = RecordingStatus.STOPPING;
            return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STOPPING), suppressInfo);
        }

        if (recordingsStopped === 0 && recordingsNotStopped > 0) {
            this.recordingStatus = RecordingStatus.STOPPING_FAILED;
            return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STOPPING_FAILED));
        }

        this.recordingStatus = RecordingStatus.STOPPING_UNKNOWN;
        return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STOPPING_UNKNOWN));
    }

    toggleRecording = async () => {
        if (this.canStartRecording()) return this.startRecording();
        if (this.canStopRecording()) return this.stopRecording();
        return this.getMessageByRecordingStatus(RecordingStatus.REQUEST_REJECTED);
    }

    setRecordingAttendeePresent = (isPresent) => {
        if (!this.attendeePresent && isPresent) {
            this.attendeePresent = true;
            this.recordingAttendeeJoined();
        }
        else if (this.attendeePresent && !isPresent) {
            this.attendeePresent = false;
            this.recordingAttendeeLeft();
        }
    }

    recordingAttendeeJoined = () => {
        if (this.recordingStatus === RecordingStatus.STARTING) {
            console.info(`RecordingProvider >> recordingAttendeeJoined`);
            this.onMeetingRecordingStarted();
        }
    }

    onMeetingRecordingStarted = () => {
        this.recordingStatus = RecordingStatus.STARTED;
        return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STARTED));
    }

    recordingAttendeeLeft = () => {
        console.info(`RecordingProvider >> recordingAttendeeLeft`);
        setTimeout(() => {
            this.onMeetingRecordingStopped();
        }, 1000);
    }

    onMeetingRecordingStopped = () => {
        this.recordingStatus = RecordingStatus.STOPPED;
        return this.publishAndReturn(this.getMessageByRecordingStatus(RecordingStatus.STOPPED));
    }

    meetingEnded = async () => {
        if (this.canStopRecording()) {
            await this.stopRecording(true);
        }
    }

    getMessageByRecordingStatus = (status) => {
        if (status === RecordingStatus.NOT_STARTED) {
            return infoMessage(`Recording not started`);
        }
        else if (status === RecordingStatus.STARTED) {
            return infoMessage(`Recording started`);
        }
        else if (status === RecordingStatus.STOPPED) {
            return infoMessage(`Recording stopped`);
        }
        else if (status === RecordingStatus.STARTING) {
            return infoMessage(`Start recording initiated`);
        }
        else if (status === RecordingStatus.STOPPING) {
            return infoMessage(`Stop recording initiated`);
        }
        else if (status === RecordingStatus.STARTING_FAILED) {
            return errorMessage(`Start Recording failed, please try again`);
        }
        else if (status === RecordingStatus.STOPPING_FAILED) {
            return errorMessage(`Stop recording failed, please try again`);
        }
        else if (status === RecordingStatus.STOPPING_UNKNOWN) {
            return errorMessage(`Unable to determine recording status, please check the meeting roster, and try to stop recording again`);
        }
        else if (status === RecordingStatus.REQUEST_REJECTED) {
            return rejectMessage(`Cannot accept the request at the moment, please try again later`);
        }
        else {
            console.error(`Unsupported recording status: ${status}`);
            return errorMessage(`Unsupported recording status: ${status}`);
        }
    }

    publishAndReturn = (notification, suppressInfo = false) => {
        this.publishRecordingStatus(suppressInfo);
        return notification;
    }

    subscribeToRecordingStatus = (callback) => {
        this.recordingStatusObservers.push(callback);
        callback(this.recordingStatus);
    };

    unsubscribeFromRecordingStatus = (callbackToRemove) => {
        this.recordingStatusObservers = this.recordingStatusObservers.filter(
            callback => callback !== callbackToRemove
        );
    };

    publishRecordingStatus = (suppressInfo = false) => {
        this.recordingStatusObservers.forEach(callback => {
            callback(this.recordingStatus, suppressInfo);
        });
    };
}

export default RecordingManager;