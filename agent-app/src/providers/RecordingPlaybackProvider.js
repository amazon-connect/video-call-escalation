import React, { useContext, useState, createContext } from 'react';

const RecordingPlaybackContext = createContext(null);

export function useRecordingPlaybackProvider() {
    const state = useContext(RecordingPlaybackContext);

    if (!state) {
        throw new Error('useRecordingPlayback must be used within RecordingPlaybackProvider');
    }

    return state;
}

export function RecordingPlaybackProvider({ children }) {

    const [externalMeetingId, setExternalMeetingId] = useState('');
    const [recordingId, setRecordingId] = useState('');
    const [recordingURL, setRecordingURL] = useState('');

    const providerValue = {
        externalMeetingId,
        recordingURL,
        recordingId,
        setExternalMeetingId,
        setRecordingURL,
        setRecordingId
    }

    return (
        <RecordingPlaybackContext.Provider value={providerValue}>
            {children}
        </RecordingPlaybackContext.Provider>
    );
}