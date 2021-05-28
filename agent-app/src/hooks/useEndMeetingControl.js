// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useHistory } from 'react-router-dom';
import { useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import { endMeeting } from '../apis/chimeAPI';
import { useAmazonConnectProvider } from '../providers/AmazonConnectProvider';
import { useAppState } from '../providers/AppStateProvider';
import routes from '../constants/routes';
import useNonInitialEffect from '../hooks/useNonInitialEffect';
import { useRecordingManager } from '../providers/RecordingProvider';
export default function useEndMeetingControl() {

    const meetingManager = useMeetingManager();
    const history = useHistory();
    const { externalMeetingId } = useAppState();
    const { contactState: connectContactState } = useAmazonConnectProvider();

    const recordingManager = useRecordingManager();

    useNonInitialEffect(() => {
        if (connectContactState !== '') {
            console.info(`[VideoCallEscalation] EndMeetingControl >> Amazon Connect Contact state: ${connectContactState}`)
            if (connectContactState === 'ended') {
                endMeetingForAll();
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectContactState]);

    function leaveMeeting() {
        recordingManager.meetingEnded();
        meetingManager.leave().then(() => {
            history.replace(routes.MEETING_SETUP);
        });
    }

    function endMeetingForAll() {
        recordingManager.meetingEnded();
        meetingManager.leave().then(() => {
            try {
                if (externalMeetingId) {
                    endMeeting(externalMeetingId)
                }
            }
            catch (e) {
                console.error('[VideoCallEscalation] Could not end meeting', e);
            }
            history.replace(routes.MEETING_SETUP)
        });

    }

    return {
        leaveMeeting,
        endMeetingForAll
    }

}