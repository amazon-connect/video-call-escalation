// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { useEffect } from 'react';
import RecordingPlaylist from '../../components/RecordingPlaylist';
import RecordingPlayer from '../../components/RecordingPlayer';
import { StyledLeft, StyledRight } from './styled';
import { useRecordingPlaybackProvider } from '../../providers/RecordingPlaybackProvider'

const RecordingPlayback = ({ externalMeetingId }) => {


    const { setExternalMeetingId } = useRecordingPlaybackProvider();

    useEffect(() => {
        setExternalMeetingId(externalMeetingId);
    }, [externalMeetingId])

    return (
        <>
            <StyledLeft>
                <RecordingPlaylist />
            </StyledLeft>
            <StyledRight>
                <RecordingPlayer />
            </StyledRight>
        </>
    );

}

export default RecordingPlayback;