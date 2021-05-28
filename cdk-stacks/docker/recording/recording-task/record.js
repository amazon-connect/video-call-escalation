// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { spawn } = require('child_process');
const { S3Uploader } = require('./util/S3Uploader');

const args = process.argv.slice(2);

const S3_BUCKET_NAME = args[0];
console.info(`RecordingProcess >> S3_BUCKET_NAME: ${S3_BUCKET_NAME}`);

const RECORDING_FILE_NAME = args[1];
console.info(`RecordingProcess >> RECORDING_FILE_NAME: ${RECORDING_FILE_NAME}`);

const BROWSER_SCREEN_WIDTH = args[2];
const BROWSER_SCREEN_HEIGHT = args[3];
console.info(`RecordingProcess >> BROWSER_SCREEN_WIDTH: ${BROWSER_SCREEN_WIDTH}, BROWSER_SCREEN_HEIGHT: ${BROWSER_SCREEN_HEIGHT}`);

const VIDEO_BITRATE = 3000;
const VIDEO_FRAMERATE = 30;
const VIDEO_GOP = VIDEO_FRAMERATE * 2;
const AUDIO_BITRATE = '160k';
const AUDIO_SAMPLERATE = 44100;
const AUDIO_CHANNELS = 2
const DISPLAY = process.env.DISPLAY;

const uploadRecordingFile = (recordingBucketName, recordingFilename, transcodeStreamToOutput) => {
    new S3Uploader(recordingBucketName, recordingFilename).uploadStream(transcodeStreamToOutput.stdout);
}

const transcodeStreamToOutput = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    // disable interaction via stdin
    '-nostdin',
    // screen image size
    '-s', `${BROWSER_SCREEN_WIDTH}x${BROWSER_SCREEN_HEIGHT}`,
    // video frame rate
    '-r', `${VIDEO_FRAMERATE}`,
    // hides the mouse cursor from the resulting video
    '-draw_mouse', '0',
    // grab the x11 display as video input
    '-f', 'x11grab',
    '-i', `${DISPLAY}`,
    // grab pulse as audio input
    '-f', 'pulse',
    '-ac', '2',
    '-i', 'default',
    // codec video with libx264
    '-vcodec', 'h264',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'main',
    '-preset', 'fast',
    '-x264opts', 'nal-hrd=cbr:no-scenecut',
    '-minrate', `${VIDEO_BITRATE}`,
    '-maxrate', `${VIDEO_BITRATE}`,
    '-g', `${VIDEO_GOP}`,
    // apply a fixed delay to the audio stream in order to synchronize it with the video stream
    '-filter_complex', 'adelay=delays=250|250, aresample=async=1:first_pts=0',
    // codec audio with aac
    '-c:a', 'aac',
    '-b:a', `${AUDIO_BITRATE}`,
    '-ac', `${AUDIO_CHANNELS}`,
    '-ar', `${AUDIO_SAMPLERATE}`,
    // adjust fragmentation to prevent seeking(resolve issue: muxer does not support non seekable output)
    '-movflags', 'frag_keyframe+empty_moov',
    '-frag_duration', '500',
    // set output format to mp4 and output file to stdout
    '-f', 'mp4', '-'
]
);

transcodeStreamToOutput.stderr.on('data', data => {
    console.info(`TranscodeStreamToOutputProcess >> stderr: ${(new Date()).toISOString()} ffmpeg: ${data}`);
});

uploadRecordingFile(S3_BUCKET_NAME, RECORDING_FILE_NAME, transcodeStreamToOutput);

// event handler for docker stop, not exit until upload completes
process.on('SIGTERM', (code, signal) => {
    console.info(`RecordingProcess >> exited with code ${code} and signal ${signal}(SIGTERM)`);
    process.kill(transcodeStreamToOutput.pid, 'SIGTERM');
});

// debug use - event handler for ctrl + c
process.on('SIGINT', (code, signal) => {
    console.log(`RecordingProcess >> exited with code ${code} and signal ${signal}(SIGINT)`)
    process.kill('SIGTERM');
});

process.on('exit', function (code) {
    console.log('RecordingProcess >> exit code', code);
});



