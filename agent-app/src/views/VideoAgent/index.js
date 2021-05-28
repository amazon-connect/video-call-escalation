// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import CCP from '../../containers/CCP'
import './styled.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import React from 'react'
import { NavigationProvider } from '../../providers/NavigationProvider';
import { useAppConfig } from '../../providers/AppConfigProvider'
import { NotificationProvider, MeetingProvider } from 'amazon-chime-sdk-component-library-react'
import Notifications from '../../containers/Notifications';
import routes from '../../constants/routes';
import MeetingView from '../MeetingView';
import DeviceSetup from '../DeviceSetup';
import MeetingSetup from '../MeetingSetup';
import { RecordingProvider } from '../../providers/RecordingProvider'


const VideoAgent = () => {

  const { meetingManagerConfig, recordingManagerConfig } = useAppConfig();

  return (
    <div className='VideoAgent'>
      <div className='mainLeft'>
        <CCP />
      </div>
      <div className='mainRight'>
        <Router>
          <NotificationProvider>
            <Notifications />
            <MeetingProvider {...meetingManagerConfig}>
              <RecordingProvider {...recordingManagerConfig}>
                <NavigationProvider>
                  <Switch>
                    <Route exact path={routes.MEETING_SETUP} component={MeetingSetup} />
                    <Route path={routes.DEVICE_SETUP}>
                      <DeviceSetup />
                    </Route>
                    <Route path={routes.MEETING}>
                      <MeetingView />
                    </Route>
                  </Switch>
                </NavigationProvider>
              </RecordingProvider>
            </MeetingProvider>
          </NotificationProvider>
        </Router>
      </div>
    </div>
  )
}

export default VideoAgent;