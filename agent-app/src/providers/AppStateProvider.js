// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext, useState } from 'react';


const AppStateContext = React.createContext(null);

export function useAppState() {
  const state = useContext(AppStateContext);

  if (!state) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return state;
}

export function AppStateProvider({ children }) {
  const [externalMeetingId, setExternalMeetingId] = useState('');
  const [meetingRegion, setMeetingRegion] = useState('');
  const [attendeeName, setAttendeeName] = useState('');
  const [cognitoName, setCognitoName] = useState('');
  const [cognitoUsername, setCognitoUsername] = useState('');
  const [authState, setAuthState] = useState('');
  const [connectLoginByEmail, setConnectLoginByEmail] = useState(false);
  const [connectUsername, setConnectUsername] = useState('');
  const [connectUserId, setConnectUserId] = useState('');


  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    return storedTheme || 'light';
  });

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      setTheme('light');
      localStorage.setItem('theme', 'light');
    }
  };

  const setCognitoUser = (
    iCognitoUsername,
    iCognitoName
  ) => {
    console.log(`[VideoCallEscalation] AppStateProvider >> setCognitoUser >> ${iCognitoUsername}  > ${iCognitoName}`);
    setCognitoUsername(iCognitoUsername);
    setCognitoName(iCognitoName);
  }

  const setAppMeetingInfo = (
    externalMeetingId,
    attendeeName,
    meetingRegion
  ) => {
    setExternalMeetingId(externalMeetingId);
    setAttendeeName(attendeeName);
    setMeetingRegion(meetingRegion);
  };

  const providerValue = {
    externalMeetingId,
    attendeeName,
    theme,
    meetingRegion,
    cognitoName,
    cognitoUsername,
    authState,
    connectLoginByEmail,
    connectUsername,
    connectUserId,
    toggleTheme,
    setAppMeetingInfo,
    setCognitoUser,
    setAuthState,
    setConnectLoginByEmail,
    setConnectUsername,
    setConnectUserId
  };

  return (
    <AppStateContext.Provider value={providerValue}>
      {children}
    </AppStateContext.Provider>
  );
}