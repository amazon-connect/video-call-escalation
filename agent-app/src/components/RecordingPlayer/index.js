// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect, useRef } from 'react';
import { useRecordingPlaybackProvider } from '../../providers/RecordingPlaybackProvider';

const RecordingPlayer = () => {

    const { recordingURL: providerRecordingURL } = useRecordingPlaybackProvider();

    const videoRef = useRef();
    const previousRecordingUrl = useRef(providerRecordingURL)

    useEffect(() => {
        if (previousRecordingUrl.current === providerRecordingURL) return;
        if (videoRef.current) videoRef.current.load();
        previousRecordingUrl.current = providerRecordingURL;

    }, [providerRecordingURL])


    return (<>
        {!providerRecordingURL ? <></> :
            <video ref={videoRef} controls width="95%">
                <source src={providerRecordingURL} type="video/mp4" />
            </video>
        }
    </>)

}

export default RecordingPlayer;