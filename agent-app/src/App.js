// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import './App.css';
import { AmplifyAuthenticator, AmplifyGreetings, AmplifySignIn } from '@aws-amplify/ui-react'
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { Auth } from '@aws-amplify/auth';
import React, { useEffect, useState, useRef } from 'react'
import VideoAgent from './views/VideoAgent'
import ErrorProvider from './providers/ErrorProvider'
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles } from 'amazon-chime-sdk-component-library-react'
import { useAppState } from './providers/AppStateProvider'
import { AmazonConnectProvider } from './providers/AmazonConnectProvider'
import { useAppConfig} from './providers/AppConfigProvider'

function App({isFederateLogin, isFederateLogout}) {

  const [greetingName, setGreetingName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const { setCognitoUser, setConnectLoginByEmail } = useAppState();
  const { authState, setAuthState } = useAppState();
  const prevAuthState = useRef();
  const { cognitoSAMLIdentityProviderName} = useAppConfig();

  useEffect(()=>{
    if(isFederateLogin){
        Auth.federatedSignIn({provider: cognitoSAMLIdentityProviderName}); //automatically init signIn
    }
    else if(isFederateLogout){
      window.location.href = `${window.location.protocol}//${window.location.host}` //back to root
    }

    return onAuthUIStateChange((nextAuthState, authData) => {
        console.debug(`[VideoCallEscalation] onAuthUIStateChange >> current is ${prevAuthState.current} while nextAuthState is ${nextAuthState}`);
        if(prevAuthState.current!==nextAuthState){
          prevAuthState.current=nextAuthState;
          handleNextAuthState(nextAuthState);
        }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const handleNextAuthState = (nextAuthState) => {
      setAuthState(nextAuthState);
      if (nextAuthState === AuthState.SignedIn) {
        Auth.currentAuthenticatedUser().then(currentUser => {
          //console.log(currentUser);
          const currentUser_Name = currentUser.attributes?.name ? currentUser.attributes?.name : (currentUser.attributes?.email ? currentUser.attributes.email:currentUser.username);
          const currentUser_Username = currentUser.attributes?.email ? currentUser.attributes.email : currentUser.username;
          setGreetingName(currentUser_Name);
          setCognitoUser(currentUser_Username, currentUser_Name);
          //if(currentUser.username.startsWith(cognitoSAMLIdentityProviderName)){ //for federated login, use email to login into CCP
            setConnectLoginByEmail(true); //always true, since cognito switched to usernameAlias="email"
          //}
          setLoaded(true);
        }).catch(error => {
          console.log('[VideoCallEscalation] ', error);
        });
      }
      if(nextAuthState === AuthState.SignedOut){
        setTimeout(() => { 
          console.debug(`[VideoCallEscalation] Logout refresh`);
          window.location = window.location.pathname;
        }, 500);
      }
  }

  return (
    //check if authenticated
    authState === AuthState.SignedIn ? (
      <div className="App">
        <AmplifyGreetings username={greetingName}>
          <span slot="logo"><h3 className='header-title'>Powered by Amazon Connect and Amazon Chime SDK</h3></span>
        </AmplifyGreetings>
        <div style={{textAlign: 'right', paddingRight: '15px' }}>
          <a href={`${window.location.protocol}//${window.location.host}/demo-website.html`} target="_blank" rel="noopener noreferrer" style={{'color' : '#3f4149'}}>Demo website</a>
        </div>
        <Theme>
          <ErrorProvider>
            <Router>
              <AmazonConnectProvider>
                {loaded ? <Route path="/" component={VideoAgent} /> : 'Loading...'}
              </AmazonConnectProvider>
            </Router>
          </ErrorProvider>
        </Theme>

      </div>
    ) : (

        <AmplifyAuthenticator style={{ display: 'flex', justifyContent: 'center' }} usernameAlias="email">
          <AmplifySignIn slot="sign-in" hideSignUp={true} usernameAlias="email">
            </AmplifySignIn>
        </AmplifyAuthenticator>

      )
  );
}

const Theme = ({ children }) => {
  const { theme } = useAppState();

  return (
    <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
};

export default App;