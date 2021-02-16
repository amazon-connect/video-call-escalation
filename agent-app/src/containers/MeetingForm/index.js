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
  ModalHeader
} from 'amazon-chime-sdk-component-library-react';

import { getErrorContext } from '../../providers/ErrorProvider';
import routes from '../../constants/routes';
import Card from '../../components/Card';
import DevicePermissionPrompt from '../DevicePermissionPrompt';
import RegionSelection from './RegionSelection';
import { useAppState } from '../../providers/AppStateProvider';
import { useAmazonConnectProvider } from '../../providers/AmazonConnectProvider';

import { createMeeting, createAttendee,  createGetAttendeeCallback} from '../../apis/chimeAPI';

const MeetingForm = () => {
  const meetingManager = useMeetingManager();
  const {
    setAppMeetingInfo,
    region: appRegion,
    meetingId: appMeetingId,
    cognitoName: appCognitoName
  } = useAppState();

  const {
    contactState : connectContactState,
    meetingTitle : connectMeetingTitle,
    attendeeName : connectAttendeeName,
    attendeeExternalUserId : connectAttendeeExternalUserId,
    sendChatMessage : connectSendChatMessage
  } = useAmazonConnectProvider();
  

  const [isError, setIsError] = useState(false);
  const [meetingId, setMeetingId] = useState(appMeetingId);
  const [meetingErr, setMeetingErr] = useState(false);
  const [agentName, setAgentName] = useState(appCognitoName);
  const [agentNameErr, setAgentNameErr] = useState(false);
  const [meetingRegion, setMeetingRegion] = useState(appRegion);
  const [isLoading, setIsLoading] = useState(false);
  const { errorMessage, updateErrorMessage } = useContext(getErrorContext());
  const history = useHistory();

  useEffect(()=>{
    if(connectContactState === 'connected'){
      if(connectMeetingTitle!==''){
        console.info(`[VideoCallEscalation] MeetingForm >> Amazon Connect meetingId: ${JSON.stringify(connectMeetingTitle)}`);
        setMeetingId(connectMeetingTitle);
      }
    }
    else{
      setMeetingId('');
    }
  },[connectContactState, connectMeetingTitle])

  //----------------------------------------------


  const handleJoinMeeting = async (e) => {
    e.preventDefault();

    const id = meetingId.trim().toLocaleLowerCase();
    const attendeeName = agentName.trim();

    if (!id || !attendeeName) {
      if (!attendeeName) {
        setAgentNameErr(true);
      }

      if (!id) {
        setMeetingErr(true);
      }

      return;
    }

    setIsLoading(true);
    meetingManager.getAttendee = createGetAttendeeCallback(id);

    try {
      const { JoinInfo } = await createMeeting(id, meetingRegion, attendeeName);


      await meetingManager.join({
        meetingInfo: JoinInfo.Meeting,
        attendeeInfo: JoinInfo.Attendee
      });

      setAppMeetingInfo(id, attendeeName, meetingRegion);
      
      if(connectAttendeeExternalUserId && connectAttendeeName){
        await connectAskCustomerToJoin(id);
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


  const connectAskCustomerToJoin = async(meetingTitle) => {
    await createAttendee(meetingTitle, connectAttendeeExternalUserId, connectAttendeeName);
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
        value={meetingId}
        // infoText="Anyone with access to the meeting ID can join"
        fieldProps={{
          name: 'meetingId',
          placeholder: 'Enter Meeting Id'
        }}
        errorText="Please enter a valid meeting ID"
        error={meetingErr}
        onChange={(e) => {
          setMeetingId(e.target.value);
          if (meetingErr) {
            setMeetingErr(false);
          }
        }}
      />
      <FormField
        field={Input}
        label="Name"
        value={agentName}
        fieldProps={{
          name: 'name',
          placeholder: 'Agent Name'
        }}
        errorText="Please enter a valid name"
        error={agentNameErr}
        onChange={(e) => {
          setAgentName(e.target.value);
          if (agentNameErr) {
            setAgentNameErr(false);
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
          <span>Loading</span>
        ) : (
            <PrimaryButton label="Continue" onClick={handleJoinMeeting} />
          )}
      </Flex>
      {isError && (
        <Modal size="md" onClose={closeError}>
          <ModalHeader title={`Meeting ID: ${meetingId}`} />
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