// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from 'react';
import RecordingPlayback from '../../containers/RecordingPlayback';
import { RecordingPlaybackProvider } from '../../providers/RecordingPlaybackProvider';
import { StyledLayout, StyledErrorMessage } from './styled'


const RecordingView = ({ externalMeetingId = '' }) => {
    return (
        <RecordingPlaybackProvider>
            <StyledLayout>
                {externalMeetingId ?
                    <RecordingPlayback externalMeetingId={externalMeetingId} /> : <StyledErrorMessage>ID not provided in the URL!</StyledErrorMessage>
                }
            </StyledLayout>
        </RecordingPlaybackProvider>
    );
}

export default RecordingView;