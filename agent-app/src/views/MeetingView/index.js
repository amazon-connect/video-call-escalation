// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import {
  VideoTileGrid,
  UserActivityProvider
} from 'amazon-chime-sdk-component-library-react';

import { StyledLayout, StyledContent } from './Styled';
import NavigationControl from '../../containers/Navigation/NavigationControl';
import { useNavigation } from '../../providers/NavigationProvider';
import MeetingControls from '../../containers/MeetingControls';

const MeetingView = () => {

  const { showNavbar, showRoster } = useNavigation();

  return (
    <UserActivityProvider>
      <StyledLayout showNav={showNavbar} showRoster={showRoster}>
        <StyledContent>
          <VideoTileGrid className="videos" />
          <MeetingControls />
        </StyledContent>
        <NavigationControl />
      </StyledLayout>
    </UserActivityProvider>
  );
};

export default MeetingView;