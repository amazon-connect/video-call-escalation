// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useContext, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Input,
  Flex,
  Heading,
  FormField,
  PrimaryButton,
  useMeetingManager,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
} from 'amazon-chime-sdk-component-library-react';

import ButtonGroup from '../../components/ButtonGroup'
import AdHocRouteModal from '../../containers/AdHocRouteModal'

import { getErrorContext } from '../../providers/ErrorProvider';
import routes from '../../constants/routes';
import Card from '../../components/Card';
import DevicePermissionPrompt from '../DevicePermissionPrompt';
import RegionSelection from './RegionSelection';
import { useAppState } from '../../providers/AppStateProvider';
import { useAmazonConnectProvider } from '../../providers/AmazonConnectProvider';
import { useRecordingManager } from '../../providers/RecordingProvider';

import { createMeeting, getAttendeeNameCallback } from '../../apis/chimeAPI';

const MeetingForm = () => {
  const meetingManager = useMeetingManager();
  const {
    setAppMeetingInfo,
    meetingRegion: appMeetingRegion,
    externalMeetingId: appExternalMeetingId,
    cognitoName: appCognitoName,
  } = useAppState();

  const {
    contactId: connectContactId,
    contactState: connectContactState,
    externalMeetingId: connectExternalMeetingId,
    attendeeName: connectAttendeeName,
    attendeeEmail: connectAttendeeEmail,
    attendeeExternalUserId: connectAttendeeExternalUserId,
    sendChatMessage: connectSendChatMessage,
    recordingManagerFeatures: connectRecordingManagerFeatures
  } = useAmazonConnectProvider();

  const recordingManager = useRecordingManager();

  const [isError, setIsError] = useState(false);
  const [externalMeetingId, setExternalMeetingId] = useState(appExternalMeetingId);
  const [externalMeetingIdErr, setExternalMeetingIdErr] = useState(false);
  const [attendeeName, setAttendeeName] = useState(appCognitoName);
  const [attendeeNameErr, setAttendeeNameErr] = useState(false);
  const [meetingRegion, setMeetingRegion] = useState(appMeetingRegion);
  const [isLoading, setIsLoading] = useState(false);
  const { errorMessage, updateErrorMessage } = useContext(getErrorContext());
  const history = useHistory();

  useEffect(() => {
    if (connectContactState === 'connected') {
      if (connectExternalMeetingId !== '') {
        console.info(`[VideoCallEscalation] MeetingForm >> Amazon Connect externalMeetingId: ${JSON.stringify(connectExternalMeetingId)}`);
        setExternalMeetingId(connectExternalMeetingId);
      }
    }
    else {
      setExternalMeetingId('');
    }
  }, [connectContactState, connectExternalMeetingId])

  //----------------------------------------------


  const handleJoinMeeting = async (e) => {
    e.preventDefault();

    if (!attendeeName) {
      setAttendeeNameErr(true);
      return;
    }

    if (!externalMeetingId) {
      setExternalMeetingIdErr(true);
      return;
    }

    setIsLoading(true);
    meetingManager.getAttendee = getAttendeeNameCallback(externalMeetingId);

    try {

      const meetingAttendees = [];
      const ownerAttendee = {
        attendeeName,
        isOwner: true
      }
      meetingAttendees.push(ownerAttendee);

      const customerAttendee = createCustomerAttendee();
      if (customerAttendee) meetingAttendees.push(customerAttendee);

      const { JoinInfo } = await createMeeting(externalMeetingId, externalMeetingId, meetingRegion, meetingAttendees);
      setAppMeetingInfo(externalMeetingId, attendeeName, meetingRegion);

      recordingManager.initRecordingStatus(externalMeetingId, connectContactId);
      recordingManager.setRecordingFeatures({ ...connectRecordingManagerFeatures });

      await meetingManager.join({
        meetingInfo: JoinInfo.Meeting,
        attendeeInfo: JoinInfo.Attendee
      });


      if (connectAttendeeExternalUserId && connectAttendeeName) {
        connectAskCustomerToJoin(externalMeetingId);
      }

      if (recordingManager.shouldAutoStartRecording()) {
        recordingManager.startRecording(true);
      }

      history.replace(routes.DEVICE_SETUP);

    } catch (error) {
      console.error(`[VideoCallEscalation] ${error.message}`);
      updateErrorMessage(error.message);
      setIsError(true);
    }
  };

  const closeError = () => {
    updateErrorMessage('');
    setIsError(false);
    setIsLoading(false);
  };

  const createCustomerAttendee = () => {
    if (!connectAttendeeExternalUserId || !connectAttendeeName) return null;
    return {
      attendeeName: connectAttendeeName,
      attendeeEmail: connectAttendeeEmail,
      externalUserId: connectAttendeeExternalUserId,
    }

  }

  const connectAskCustomerToJoin = () => {
    let messageToSend = `Automatic reply: agent started video session`;
    connectSendChatMessage(messageToSend);
  }

  return (
    <form>
      <Heading tag="h3" level={6} css="margin-bottom: 1rem">
        Join a meeting
      </Heading>
      <FormField
        field={Input}
        label="Meeting Id"
        value={externalMeetingId}
        // infoText="Anyone with access to the meeting ID can join"
        fieldProps={{
          name: 'externalMeetingId',
          placeholder: 'Enter Meeting Id'
        }}
        errorText="Please enter a valid meeting ID"
        error={externalMeetingIdErr}
        onChange={(e) => {
          setExternalMeetingId(e.target.value.trim().toLocaleLowerCase());
          if (externalMeetingIdErr) {
            setExternalMeetingIdErr(false);
          }
        }}
      />
      <FormField
        field={Input}
        label="Your Name"
        value={attendeeName}
        fieldProps={{
          name: 'attendeeName',
          placeholder: 'Your Name'
        }}
        errorText="Please enter a valid name"
        error={attendeeNameErr}
        onChange={(e) => {
          setAttendeeName(e.target.value.trim());
          if (attendeeNameErr) {
            setAttendeeNameErr(false);
          }
        }}
      />
      <RegionSelection setRegion={setMeetingRegion} region={meetingRegion} />
      <Flex
        container
        layout="fill-space-centered"
        style={{ marginTop: '2.5rem' }}
      >
        {isLoading ? (
          <Flex layout="fill-space-centered">
            <Spinner width="2rem" height="2rem" />
          </Flex>
        ) : (
          <ButtonGroup
            primaryButtons={[
              <PrimaryButton key="startBtn" label="Start" onClick={handleJoinMeeting} disabled={externalMeetingId.trim() === ''} />,
              <AdHocRouteModal key="adhocModalBtn" />
            ]}
          />
        )}
      </Flex>
      {isError && (
        <Modal size="md" onClose={closeError}>
          <ModalHeader title={`Meeting ID: ${externalMeetingId}`} />
          <ModalBody>
            <Card
              title="Unable to join meeting"
              description="There was an issue creating that meeting. The meeting may have already ended, or your authorization may have expired."
              smallText={errorMessage}
            />
          </ModalBody>
        </Modal>
      )}
      <DevicePermissionPrompt />
    </form>
  );
};

export default MeetingForm;