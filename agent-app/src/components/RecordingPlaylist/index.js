// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import { getRecordingSummary } from '../../apis/recordingAPI';
import { StyledErrorMessage } from './styled';
import { Spinner, RosterGroup, RosterCell, Play, IconButton, Roster, RosterHeader } from 'amazon-chime-sdk-component-library-react';
import { useRecordingPlaybackProvider } from '../../providers/RecordingPlaybackProvider';

const RecordingPlaylist = () => {

    const { externalMeetingId, recordingId, setRecordingId, setRecordingURL } = useRecordingPlaybackProvider();

    const [isLoaded, setIsLoaded] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [recordingSummaryResult, setRecordingSummaryResult] = useState([]);

    useEffect(() => {
        if (externalMeetingId) {
            setIsLoaded(false);
            getRecordingSummary(externalMeetingId).then(result => {
                setRecordingSummaryResult(result || []);
                setIsLoaded(true);
            }).catch(error => {
                console.error('[VideoCallEscalation] > RecordingPlaylist > getRecordingSummary: ', error);
                setErrorMessage(error.message);
                setIsLoaded(true);
            });
        }
    }, [externalMeetingId])

    const handlePlayback = (recordingId, recordingURL) => {
        setRecordingId(recordingId)
        setRecordingURL(recordingURL);
    }

    return (
        <div>
            {!isLoaded ? <Spinner width="2rem" height="2rem" /> :
                <>
                    <Roster css="width: 21.5rem">
                        <RosterHeader
                            title="Recording Playlist"
                            badge={recordingSummaryResult.length}
                        />
                        <RosterGroup title={externalMeetingId}>
                            {recordingSummaryResult.map((recordingItem => {
                                const createdAtDate = new Date(recordingItem.createdAt);
                                return (
                                    <RosterCell
                                        extraIcon={
                                            <IconButton icon={<Play />}
                                                selected={recordingId === recordingItem.recordingId}
                                                onClick={() => handlePlayback(recordingItem.recordingId, recordingItem.recordingURL)}  >
                                            </IconButton>}

                                        id={`ci-recordingItem-${recordingItem.recordingId}`}
                                        key={`ci-recordingItem-${recordingItem.recordingId}`}
                                        name={`Recorded At: ${createdAtDate.toLocaleDateString()} ${createdAtDate.toLocaleTimeString()}`}
                                        subtitle={recordingItem.recordingId}
                                    />
                                )
                            }))}



                        </RosterGroup>
                    </Roster>
                    {errorMessage && (<StyledErrorMessage>{errorMessage}</StyledErrorMessage>)}
                </>
            }
        </div>
    );

}

export default RecordingPlaylist;