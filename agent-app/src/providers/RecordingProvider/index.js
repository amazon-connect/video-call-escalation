// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext, useState, createContext, useEffect } from 'react';
import RecordingManager from './RecordingManager';
import useNotificationHelper from '../../hooks/useNotificationHelper';
import { RecordingStatus } from '../../constants';
import { useRosterState } from 'amazon-chime-sdk-component-library-react';


const RecordingContext = createContext(RecordingManager | null);

export function useRecordingManager() {
    const recordingManager = useContext(RecordingContext);

    if (!recordingManager) {
        throw new Error('useRecordingManager must be used within RecordingProvider');
    }

    return recordingManager;
}

export const RecordingProvider = ({
    deployRecordingStack = false,
    recordingAttendeeName = '',
    recordingManager: recordingManagerProp,
    children }) => {


    const { displayNotification } = useNotificationHelper();
    const { roster } = useRosterState();

    const [recordingManager] = useState(
        () => recordingManagerProp || new RecordingManager({ deployRecordingStack, recordingAttendeeName })
    );

    useEffect(() => {
        if (recordingManager.shouldMonitorMeetingRoster()) {
            const attendees = Object.values(roster);
            const recordingAttendee = attendees.find((attendee) =>
                attendee?.name === recordingAttendeeName
            );

            if (recordingAttendee) {
                console.info('Recording Provider >> rosterUpdate: setRecordingAttendeePresent:', true);
                recordingManager.setRecordingAttendeePresent(true);
            }
            else {
                console.info('Recording Provider >> rosterUpdate: setRecordingAttendeePresent:', false);
                recordingManager.setRecordingAttendeePresent(false);
            }
        }
    }, [roster]);

    useEffect(() => {
        recordingManager.subscribeToRecordingStatus(onRecordingManagerStatusUpdate);
        return () => {
            recordingManager.unsubscribeFromRecordingStatus(onRecordingManagerStatusUpdate);
        }
    }, []);

    const onRecordingManagerStatusUpdate = (recordingStatus, suppressInfo) => {
        if (recordingStatus === RecordingStatus.NOT_STARTED) return;
        const notification = recordingManager.getMessageByRecordingStatus(recordingStatus);
        if (notification.info && suppressInfo) return;
        displayNotification(notification);
    }

    return (
        <RecordingContext.Provider value={recordingManager}>
            {children}
        </RecordingContext.Provider>
    )

}
