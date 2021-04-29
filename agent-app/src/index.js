// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import Amplify from '@aws-amplify/core'

import { AppStateProvider } from './providers/AppStateProvider'
import { AppConfigProvider } from './providers/AppConfigProvider';

const isFederateLogin = window.location.search === '?federate' ? true : false
const isFederateLogout = window.location.search === '?logout' ? true : false

const vceConfig = window.vceConfig;

//Configure Amplify - using CDK outputs
const amplifyAuthConfig = {
  identityPoolId: vceConfig.identityPoolId,
  userPoolId: vceConfig.userPoolId,
  userPoolWebClientId: vceConfig.userPoolWebClientId,
  region: vceConfig.backendRegion
}

//federation
if (vceConfig.cognitoSAMLEnabled === "true") {
  amplifyAuthConfig['oauth'] = {
    domain: vceConfig.cognitoDomainURL.replace(/(^\w+:|^)\/\//, ''),
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
      name: 'connectAPI',
      endpoint: vceConfig.connectAPI.replace(/\/$/, ""),
      region: amplifyAuthConfig.region
    },
    {
      name: 'chimeAPI',
      endpoint: vceConfig.chimeAPI.replace(/\/$/, ""),
      region: amplifyAuthConfig.region
    },
    {
      name: 'routingAPI',
      endpoint: vceConfig.routingAPI.replace(/\/$/, ""),
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
    <AppConfigProvider vceConfig={vceConfig}>
      <AppStateProvider>
        <App isFederateLogin={isFederateLogin} isFederateLogout={isFederateLogout} />
      </AppStateProvider>
    </AppConfigProvider>


  </React.StrictMode>,
  document.getElementById('root')
);
