// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import Amplify from '@aws-amplify/core'
import cdkExports from './cdk-exports.json'

import { AppStateProvider } from './providers/AppStateProvider'
import { AppConfigProvider } from './providers/AppConfigProvider';

const isFederateLogin = window.location.search==='?federate'?true:false
const isFederateLogout = window.location.search==='?logout'?true:false

//Configure Amplify - using CDK outputs
const amplifyAuthConfig = {
  identityPoolId: cdkExports.VideoCallEscalationStack.identityPoolId,
  userPoolId: cdkExports.VideoCallEscalationStack.userPoolId,
  userPoolWebClientId: cdkExports.VideoCallEscalationStack.userPoolWebClientId,
  region: cdkExports.VideoCallEscalationStack.backendRegion
}

//federation
if(cdkExports.VideoCallEscalationStack.cognitoSAMLEnabled === "true"){
  amplifyAuthConfig['oauth'] = {
    domain: cdkExports.VideoCallEscalationStack.cognitoDomainURL.replace(/(^\w+:|^)\/\//, ''),
    scope: ['email', 'openid', 'aws.cognito.signin.user.admin'],
    redirectSignIn: `${window.location.protocol}//${window.location.host}`,
    redirectSignOut: `${window.location.protocol}//${window.location.host}/?logout`,
    responseType: 'token',
    label: 'Sign in with SSO',
    customProvider: 'AWSSSO'
  }
}

const amplifyAPIConfig = {
  endpoints: [
    {
      name: 'videoCallEscalationConnectAPI',
      endpoint: cdkExports.VideoCallEscalationStack.videoCallEscalationConnectAPI.replace(/\/$/, ""),
      region: amplifyAuthConfig.region
    },
    {
      name: 'videoCallEscalationChimeAPI',
      endpoint: cdkExports.VideoCallEscalationStack.videoCallEscalationChimeAPI.replace(/\/$/, ""),
      region: amplifyAuthConfig.region
    },
    {
      name: 'videoCallEscalationRoutingAPI',
      endpoint: cdkExports.VideoCallEscalationStack.videoCallEscalationRoutingAPI.replace(/\/$/, ""),
      region: amplifyAuthConfig.region
    }
  ]
}

Amplify.configure({
  Auth: amplifyAuthConfig,
  API: amplifyAPIConfig
});

ReactDOM.render(
  <React.StrictMode>
    <AppConfigProvider>
      <AppStateProvider>
        <App isFederateLogin={isFederateLogin} isFederateLogout={isFederateLogout}/>
      </AppStateProvider>
    </AppConfigProvider>


  </React.StrictMode>,
  document.getElementById('root')
);
