// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

/**
 * S3Upload Class
 * Upload a recording artifact to S3
 */
class S3Uploader {
    /**
     * @constructor
     * @param {*} bucket - the S3 bucket name uploaded to
     * @param {*} key - the file name in S3 bucket
     */
    constructor(bucket, key) {
        this.bucket = bucket;
        this.key = key;
        this.s3Uploader = new AWS.S3({ params: { Bucket: bucket, Key: key, ContentType: 'video/mp4' } });
        console.info(`S3Uploader >> UploadProcess >> constructed a S3 object with bucket: ${this.bucket}, key: ${this.key}`);
    }

    uploadStream(stream) {
        const managedUpload = this.s3Uploader.upload({ Body: stream }, (err, data) => {
            if (err) {
                console.error('S3Uploader >> StreamUploadProcess >> error handling on failure', err);
            } else {
                console.error(`S3Uploader >> StreamUploadProcess >> success - uploaded the file to: ${data.Location}`);
                process.exit();
            }
        });
        managedUpload.on('httpUploadProgress', function (event) {
            console.info(`[S3Uploader >> StreamUploadProcess >> on httpUploadProgress ${event.loaded} bytes`);
        });
    }
}

module.exports = {
    S3Uploader
};
