// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext, useState } from 'react';
import { ConnectContactAttributes } from '../constants/index';

const AmazonConnectContext = React.createContext(null);

export function useAmazonConnectProvider() {
    const state = useContext(AmazonConnectContext);

    if (!state) {
        throw new Error('useAmazonConnectProvider must be used within AmazonConnectProvider');
    }

    return state;
}

export function AmazonConnectProvider({ children }) {

    const [contactId, setContactId] = useState(null);
    const [agentChatSession, setAgentChatSession] = useState(null);
    const [contactState, setContactState] = useState(null);
    const [externalMeetingId, setExternalMeetingId] = useState('');
    const [attendeeName, setAttendeeName] = useState('');
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [attendeeExternalUserId, setAttendeeExternalUserId] = useState('');
    const [videoRecordingAutoStartEnabled, setVideoRecordingAutoStartEnabled] = useState(false);
    const [videoRecordingStartStopEnabled, setVideoRecordingStartStopEnabled] = useState(false);

    const subscribeToEvents = () => {
        const connect = window.connect;
        if (connect.core.initialized) {
            console.info(`[VideoCallEscalation] AmazonConnectProvider >> Subscribing to Connect Events`);
            connect.contact(contact => {
                contact.onConnecting(contact => {
                    console.info(`[VideoCallEscalation] AmazonConnectProvider >> onConnecting() >> contactId = ${contact.contactId}`);
                    setContactId(contact.contactId);
                    setContactState(connect.ContactStateType.CONNECTING);
                    processContactAttributes(contact);
                });

                contact.onConnected(contact => {
                    console.info(`[VideoCallEscalation] AmazonConnectProvider >> onConnected() >> contactId = ${contact.contactId}`);
                    setContactId(contact.contactId);
                    setContactState(connect.ContactStateType.CONNECTED);
                    processContactAttributes(contact);
                    if (contact.getType() === "chat") {
                        contact.getAgentConnection().getMediaController().then((controller) => {
                            console.info(`[VideoCallEscalation] AmazonConnectProvider >> Media Controller`);
                            setAgentChatSession(controller);
                        })
                    }
                })

                contact.onACW(contact => {
                    console.info(`[VideoCallEscalation] AmazonConnectProvider >> onACW() >> contactId = ${contact.contactId}`);
                    setContactId(contact.contactId);
                    setContactState('ACW');
                })

                contact.onDestroy(contact => {
                    console.info(`[VideoCallEscalation] AmazonConnectProvider >> onDestroy() >> contactId = ${contact.contactId}`);
                    setContactId(contact.contactId);
                    setContactState(contact.getState().type);
                    clearState();
                })

                contact.onMissed(contact => {
                    console.info(`[VideoCallEscalation] AmazonConnectProvider >> onMissed() >> contactId = ${contact.contactId}`);
                    setContactId(contact.contactId);
                    setContactState(window.connect.ContactStateType.MISSED);
                })

                contact.onError(contact => {
                    console.info(`[VideoCallEscalation] AmazonConnectProvider >> onError() >> contactId = ${contact.contactId}`);
                    setContactId(contact.contactId);
                    setContactState(window.connect.ContactStateType.ERROR);
                    clearState();
                })
            })
        }
        else {
            setTimeout(() => { subscribeToEvents(); }, 3000);
        }
    }

    const processContactAttributes = (contact) => {
        const contactAttributes = contact.getAttributes();
        console.info(`[VideoCallEscalation] AmazonConnectProvider >> ContactAttributes >> `, contactAttributes)

        setExternalMeetingId(getContactAttributeValue(contactAttributes[ConnectContactAttributes.videoExternalMeetingId]));
        setAttendeeExternalUserId(getContactAttributeValue(contactAttributes[ConnectContactAttributes.videoAttendeeExternalUserId]));
        setAttendeeName(getContactAttributeValue(contactAttributes[ConnectContactAttributes.videoAttendeeName]));
        setAttendeeEmail(getContactAttributeValue(contactAttributes[ConnectContactAttributes.videoAttendeeEmail]));

        setVideoRecordingAutoStartEnabled(getBoolContactAttributeValue(contactAttributes[ConnectContactAttributes.videoRecordingAutoStartEnabled]));
        setVideoRecordingStartStopEnabled(getBoolContactAttributeValue(contactAttributes[ConnectContactAttributes.videoRecordingStartStopEnabled]));
    }

    const sendChatMessage = (message) => {
        agentChatSession.sendMessage({ 'message': message, 'contentType': 'text/plain' });
    }

    const clearState = () => {
        try {
            setAgentChatSession(null);
            setExternalMeetingId('');
            setAttendeeName('');
            setAttendeeEmail('');
            setAttendeeExternalUserId('');

            setVideoRecordingAutoStartEnabled(false);
            setVideoRecordingStartStopEnabled(false);
        }
        catch (error) {
            console.error(`[VideoCallEscalation] AmazonConnectProvider`, error);
        }

    }

    const getContactAttributeValue = (attribute, defaultValue = '') => {
        return attribute?.value.trim() || defaultValue;
    }

    const getBoolContactAttributeValue = (attribute) => {
        return attribute?.value.trim().toLocaleLowerCase() === "true"
    }

    const recordingManagerFeatures = {
        videoRecordingAutoStartEnabled,
        videoRecordingStartStopEnabled
    }

    const providerValue = {
        contactId,
        agentChatSession,
        contactState,
        externalMeetingId,
        attendeeName,
        attendeeEmail,
        attendeeExternalUserId,
        recordingManagerFeatures,
        subscribeToEvents,
        sendChatMessage
    };
    return (
        <AmazonConnectContext.Provider value={providerValue}>
            {children}
        </AmazonConnectContext.Provider>
    );
}