// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { Heading } from 'amazon-chime-sdk-component-library-react';

import { StyledLayout } from './Styled';
import DeviceSelection from '../../components/DeviceSelection';
import MeetingJoinDetails from '../../containers/MeetingJoinDetails'
import useEndMeetingControl from '../../hooks/useEndMeetingControl';

const DeviceSetup = () =>{
  
  useEndMeetingControl();
  
  return (
    <StyledLayout>
      <Heading tag="h1" level={6} css="align-self: flex-start">
        Device settings
      </Heading>
      <DeviceSelection />
      <MeetingJoinDetails />
    </StyledLayout>
  );
} 

export default DeviceSetup;