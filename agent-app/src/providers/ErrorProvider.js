// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';


const context = React.createContext({
  errorMessage: '',
  updateErrorMessage: (_) => {},
});

export function getErrorContext() {
  return context;
}

export default function ErrorProvider({ children }) {
  const [errorMessage, setErrorMessage] = useState('');
  const ErrorContext = getErrorContext();

  const updateErrorMessage = (message) => {
    setErrorMessage(message);
  };

  const providerValue = {
    errorMessage,
    updateErrorMessage,
  };
  return (
    <ErrorContext.Provider value={providerValue}>
      {children}
    </ErrorContext.Provider>
  );
}