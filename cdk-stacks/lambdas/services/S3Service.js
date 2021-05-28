// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ErrorHandler = require('../lib/Error');
const S3Client = require('aws-sdk/clients/s3');
const S3 = new S3Client({ signatureVersion: 'v4' });

const generatePreSignedURL = async (objectBucket, objectKey, objectExpires) => {

    if (!objectBucket) throw new ErrorHandler(400, 'Must provide objectBucket');
    if (!objectKey) throw new ErrorHandler(400, 'Must provide objectKey');
    if (!objectExpires) throw new ErrorHandler(400, 'Must provide objectExpires');

    const preSignedURL = await S3.getSignedUrlPromise('getObject', {
        Bucket: objectBucket,
        Key: objectKey,
        Expires: objectExpires
    }).catch(error => {
        console.error('S3.getSignedUrlPromise: ', error);
        throw new ErrorHandler(500, 'S3 Get Signed URL Error, please try again later');
    })

    return preSignedURL;
}

module.exports = {
    generatePreSignedURL
}