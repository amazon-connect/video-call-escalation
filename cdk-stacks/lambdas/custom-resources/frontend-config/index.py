#!/usr/bin/env python

import boto3
import logging
import json
import contextlib
from urllib.request import Request, urlopen
from uuid import uuid4
import tempfile
import os
from zipfile import ZipFile
import shutil

logger = logging.getLogger()
logger.setLevel(logging.INFO)

CFN_SUCCESS = "SUCCESS"
CFN_FAILED = "FAILED"

s3 = boto3.client("s3")


def create(bucket_name, web_app_staging_object_prefix, web_app_root_object_prefix, object_key, object_content, object_content_type):

    workdir = tempfile.mkdtemp()
    logger.info("| workdir: %s" % workdir)

    raw_file_complete = os.path.join(workdir, object_key)
    logger.info("| write file: %s" % raw_file_complete)
    raw_file = open(raw_file_complete, 'w')
    raw_file.write(object_content)
    raw_file.close()

    zip_file_name = f"{os.path.splitext(object_key)[0]}.zip"
    zip_file_complete = os.path.join(workdir, zip_file_name)
    logger.info("| zip into file: %s" % zip_file_complete)
    ZipFile(zip_file_complete, mode='w').write(
        raw_file_complete, arcname=object_key)

    # upload to WebAppStaging
    staging_object_url = f"s3://{bucket_name}/{web_app_staging_object_prefix}{zip_file_name}"
    logger.info(f"Uploading frontend config to {staging_object_url}")
    s3.upload_file(zip_file_complete, bucket_name,
                   f"{web_app_staging_object_prefix}{zip_file_name}")

    # upload to WebAppRoot
    root_object_url = f"s3://{bucket_name}/{web_app_root_object_prefix}{object_key}"
    logger.info(f"Uploading frontend config to {root_object_url}")
    s3.upload_file(raw_file_complete, bucket_name,
                   f"{web_app_root_object_prefix}{object_key}", ExtraArgs={'Metadata': {'ContentType': object_content_type}})

    shutil.rmtree(workdir)


def delete(bucket_name, web_app_staging_object_prefix, object_key):

    zip_file_name = f"{os.path.splitext(object_key)[0]}.zip"

    object_url = f"s3://{bucket_name}/{web_app_staging_object_prefix}{zip_file_name}"
    logger.info(f"Removing frontend config from {object_url}")

    s3.delete_object(
        Bucket=bucket_name,
        Key=f"{web_app_staging_object_prefix}{zip_file_name}"
    )


def handler(event, context):

    def cfn_error(message=None):
        logger.error("| cfn_error: %s" % message)
        cfn_send(event, context, CFN_FAILED, reason=message)

    try:
        logger.info(event)

        # cloudformation request type (create/update/delete)
        request_type = event['RequestType']

        # extract resource properties
        props = event['ResourceProperties']
        old_props = event.get('OldResourceProperties', {})
        physical_id = event.get('PhysicalResourceId', None)

        bucket_name = props["BucketName"]
        object_key = props["ObjectKey"]

        # if we are creating a new resource, allocate a physical id for it
        # otherwise, we expect physical id to be relayed by cloudformation
        if request_type == "Create":
            physical_id = "vce.frontend-config.%s" % str(uuid4())
        else:
            if not physical_id:
                cfn_error(
                    "invalid request: request type is '%s' but 'PhysicalResourceId' is not defined" % request_type)
                return

        if request_type == "Create" or request_type == "Update":
            web_app_staging_object_prefix = props["WebAppStagingObjectPrefix"]
            web_app_root_object_prefix = props["WebAppRootObjectPrefix"]
            object_content = props.get("Content")
            object_content_type = props.get("ContentType")
            create(bucket_name, web_app_staging_object_prefix, web_app_root_object_prefix, object_key,
                   object_content, object_content_type)

        if request_type == "Delete":
            web_app_staging_object_prefix = props["WebAppStagingObjectPrefix"]
            delete(bucket_name, web_app_staging_object_prefix, object_key)

        cfn_send(event, context, CFN_SUCCESS, physicalResourceId=physical_id)

    except KeyError as e:
        cfn_error("invalid request. Missing key %s" % str(e))
    except Exception as e:
        logger.exception(e)
        cfn_error(str(e))

# ---------------------------------------------------------------------------------------------------
# sends a response to cloudformation


def cfn_send(event, context, responseStatus, responseData={}, physicalResourceId=None, noEcho=False, reason=None):

    responseUrl = event['ResponseURL']
    logger.info(responseUrl)

    responseBody = {}
    responseBody['Status'] = responseStatus
    responseBody['Reason'] = reason or (
        'See the details in CloudWatch Log Stream: ' + context.log_stream_name)
    responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
    responseBody['StackId'] = event['StackId']
    responseBody['RequestId'] = event['RequestId']
    responseBody['LogicalResourceId'] = event['LogicalResourceId']
    responseBody['NoEcho'] = noEcho
    responseBody['Data'] = responseData

    body = json.dumps(responseBody)
    logger.info("| response body:\n" + body)

    headers = {
        'content-type': '',
        'content-length': str(len(body))
    }

    try:
        request = Request(responseUrl, method='PUT', data=bytes(
            body.encode('utf-8')), headers=headers)
        with contextlib.closing(urlopen(request)) as response:
            logger.info("| status code: " + response.reason)
    except Exception as e:
        logger.error("| unable to send response to CloudFormation")
        logger.exception(e)
