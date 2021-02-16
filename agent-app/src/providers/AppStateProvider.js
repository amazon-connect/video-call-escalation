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
  const [meetingId, setMeeting] = useState('');
  const [region, setRegion] = useState('');
  const [localUserName, setLocalName] = useState('');
  const [cognitoName, setCognitoName] = useState('');
  const [cognitoUsername, setCognitoUsername] = useState('');
  const [authState, setAuthState] = useState('');
  const [connectLoginByEmail, setConnectLoginByEmail] = useState(false);
  
  
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
    meetingId,
    name,
    region
  ) => {
    setRegion(region);
    setMeeting(meetingId);
    setLocalName(name);
  };

  const providerValue = {
    meetingId,
    localUserName,
    theme,
    region,
    cognitoName,
    cognitoUsername,
    authState,
    connectLoginByEmail,
    toggleTheme,
    setAppMeetingInfo,
    setCognitoUser,
    setAuthState,
    setConnectLoginByEmail
  };

  return (
    <AppStateContext.Provider value={providerValue}>
      {children}
    </AppStateContext.Provider>
  );
}