// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { LogLevel } from 'amazon-chime-sdk-js';

export const VIDEO_INPUT = {
  NONE: 'None',
  BLUE: 'Blue',
  SMPTE: 'SMPTE Color Bars',
};

export const AUDIO_INPUT = {
  NONE: 'None',
  440: '440 Hz',
};

export const MAX_REMOTE_VIDEOS = 16;

export const AVAILABLE_AWS_REGIONS = {
  'us-east-1': 'United States (N. Virginia)',
  'ap-northeast-1': 'Japan (Tokyo)',
  'ap-southeast-1': 'Singapore',
  'ap-southeast-2': 'Australia (Sydney)',
  'ca-central-1': 'Canada',
  'eu-central-1': 'Germany (Frankfurt)',
  'eu-north-1': 'Sweden (Stockholm)',
  'eu-west-1': 'Ireland',
  'eu-west-2': 'United Kingdom (London)',
  'eu-west-3': 'France (Paris)',
  'sa-east-1': 'Brazil (São Paulo)',
  'us-east-2': 'United States (Ohio)',
  'us-west-1': 'United States (N. California)',
  'us-west-2': 'United States (Oregon)',
};

export const VIDEO_INPUT_QUALITY = {
  '360p': '360p (nHD) @ 15 fps (600 Kbps max)',
  '540p': '540p (qHD) @ 15 fps (1.4 Mbps max)',
  '720p': '720p (HD) @ 15 fps (1.4 Mbps max)',
};

export const SDK_LOG_LEVELS = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'off': LogLevel.OFF,
}

export const DevicePermissionStatus = {
  UNSET: 'UNSET',
  IN_PROGRESS: 'IN_PROGRESS',
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
}

export const DemoWebsitePage = 'demo-website.html'

export const DeprecatedConnectDomain = 'awsapps.com'

export const RecordingStatus = {
  NOT_STARTED: 'NOT_STARTED',
  STARTED: 'STARTED',
  STOPPED: 'STOPPED',
  STARTING: 'STARTING',
  STOPPING: 'STOPPING',
  STARTING_FAILED: 'STARTING_FAILED',
  STOPPING_FAILED: 'STOPPING_FAILED',
  STOPPING_UNKNOWN: 'STOPPING_UNKNOWN',
  REQUEST_REJECTED: 'REQUEST_REJECTED'
}

export const ConnectContactAttributes = {
  videoExternalMeetingId: 'videoExternalMeetingId',
  videoAttendeeExternalUserId: 'videoAttendeeExternalUserId',
  videoAttendeeName: 'videoAttendeeName',
  videoAttendeeEmail: 'videoAttendeeEmail',
  videoRecordingAutoStartEnabled: 'videoRecordingAutoStartEnabled',
  videoRecordingStartStopEnabled: 'videoRecordingStartStopEnabled',
  videoRecordingPlaybackURL: 'videoRecordingPlaybackURL'
}
