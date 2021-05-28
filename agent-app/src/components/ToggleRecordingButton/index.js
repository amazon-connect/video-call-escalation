// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import { ControlBarButton, Record, Spinner } from 'amazon-chime-sdk-component-library-react';
import { useRecordingManager } from '../../providers/RecordingProvider';
import { RecordingStatus } from '../../constants/index';
import useNotificationHelper from '../../hooks/useNotificationHelper';

const ToggleRecordingButton = () => {

    const recordingManager = useRecordingManager();
    const toggleRecordingEnabled = recordingManager.toggleRecordingEnabled();

    const [toggleButtonSelected, setToggleButtonSelected] = useState(false);
    const [toggleButtonSpinnerIcon, setToggleButtonSpinnerIcon] = useState(false);

    const { displayNotification } = useNotificationHelper();

    useEffect(() => {
        recordingManager.subscribeToRecordingStatus(onRecordingManagerStatusUpdate);
        return () => {
            recordingManager.unsubscribeFromRecordingStatus(onRecordingManagerStatusUpdate);
        }
    }, []);

    const onRecordingManagerStatusUpdate = (recordingStatus) => {
        refreshRecordingStatus(recordingStatus);
    }

    const refreshRecordingStatus = (status) => {
        if (status === RecordingStatus.NOT_STARTED) {
            updateToggleButton(false, false)
        }
        else if (status === RecordingStatus.STARTED) {
            updateToggleButton(true, false)
        }
        else if (status === RecordingStatus.STOPPED) {
            updateToggleButton(false, false)
        }
        else if (status === RecordingStatus.STARTING) {
            updateToggleButton(true, true);
        }
        else if (status === RecordingStatus.STOPPING) {
            updateToggleButton(true, true);
        }
        else if (status === RecordingStatus.STARTING_FAILED) {
            updateToggleButton(false, false);
        }
        else if (status === RecordingStatus.STOPPING_FAILED) {
            updateToggleButton(true, false);
        }
        else if (status === RecordingStatus.STOPPING_UNKNOWN) {
            updateToggleButton(false, false)
        }
        else {
            console.error(`Unsupported recording status: ${status}`);
        }
    }

    const updateToggleButton = (selected, spinner) => {
        setToggleButtonSelected(selected);
        setToggleButtonSpinnerIcon(spinner);
    }

    const handleRecordToggle = () => {
        setToggleButtonSpinnerIcon(true);
        recordingManager.toggleRecording().then((result) => {
            console.info(`Toggle Recording Result: `, result);
            if (result.reject) {
                displayNotification(result);
            }
        });
    }

    return (
        <>
            {
                toggleRecordingEnabled && (
                    <ControlBarButton
                        icon={toggleButtonSpinnerIcon ? <Spinner /> : <Record />}
                        onClick={handleRecordToggle}
                        label="Record"
                        isSelected={toggleButtonSelected}
                    />
                )
            }
        </>
    );
}

export default ToggleRecordingButton;