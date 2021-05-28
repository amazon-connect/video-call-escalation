// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import './styled.css';
import React, { useState, useEffect, useRef, useContext } from 'react'
import 'amazon-connect-streams';
import 'amazon-connect-chatjs';
import { Modal, ModalBody, ModalHeader, Spinner } from 'amazon-chime-sdk-component-library-react';
import Card from '../../components/Card';
import { ccpLogin } from '../../apis/connectAPI'
import { getErrorContext } from '../../providers/ErrorProvider';
import { useAppConfig } from '../../providers/AppConfigProvider'
import { useAmazonConnectProvider } from '../../providers/AmazonConnectProvider'
import { useAppState } from '../../providers/AppStateProvider';
import { useInitProvider } from '../../providers/InitProvider';

const CCP = ({ isOnboarding = false }) => {

    const {
        connectInstanceURL,
        connectInstanceRegion
    } = useAppConfig();

    const { initConnectUser } = useInitProvider();

    const {
        connectLoginByEmail,
        setConnectUsername
    } = useAppState()

    const {
        subscribeToEvents
    } = useAmazonConnectProvider()

    const { errorMessage, updateErrorMessage } = useContext(getErrorContext());

    const [isError, setIsError] = useState(false);
    const [credentials, setCredentials] = useState('');
    const [destination, setDestination] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    const loginFrm = useRef();
    const hidden_iframe_div = useRef();

    useEffect(() => {
        implementIframe();
        ccpLogin(connectLoginByEmail).then(connectLoginCredentials => {
            setCredentials(JSON.stringify(connectLoginCredentials));
            loginFrm.current.submit();
            setLoggedIn(true);
        }).catch(error => {
            updateErrorMessage(error.message);
            setIsError(true);
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectInstanceURL]);

    useEffect(() => {
        if (loggedIn) {
            setTimeout(() => {
                if (!window.connect.core.initialized) {
                    console.info(`[VideoCallEscalation] Connect initialization started`);
                    window.connect.core.initCCP(document.querySelector('#ccpContainer'), {
                        ccpUrl: connectInstanceURL + '/ccp-v2',
                        loginPopup: false,
                        region: connectInstanceRegion,
                        softphone: {
                            allowFramedSoftphone: !isOnboarding,
                            disableRingtone: isOnboarding
                        }
                    });

                    window.connect.agent(agent => {
                        onConnectInitialized(agent);
                    });
                }
                else {
                    console.info(`[VideoCallEscalation] Connect Already Initialized`);
                }
            }, 3000);

        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn]);

    const onConnectInitialized = async (connectAgent) => {
        console.info(`[VideoCallEscalation] Connect Init completed, removing hidden_iframe!`);
        hidden_iframe_div.current.innerHTML = '';

        if (isOnboarding) {
            await initConnectUser();
        }
        else {
            const connectAgentConfiguration = connectAgent.getConfiguration();
            setConnectUsername(connectAgentConfiguration.username);
            setLoaded(true);
            if (!isOnboarding) subscribeToEvents();
        }
    }

    const handleLogin = async (e) => {
        console.info(`[VideoCallEscalation] CCP Login Form Submitted`);
    }

    const implementIframe = () => {
        hidden_iframe_div.current.innerHTML = `<iframe src="" id="hidden_iframe" name="hidden_iframe" frameBorder="0" style="height:1px;visibility:hidden"></iframe>`;
    }

    const closeError = () => {
        updateErrorMessage('');
        setIsError(false);
        setLoaded(true);
    };

    return (
        <>
            <div className="CCP">
                <div id="ccpLoading" style={loaded || isOnboarding ? { display: 'none' } : { display: 'block' }} ><Spinner width="3rem" height="3rem" /></div>
                <div id="ccpContainer" style={loaded && !isOnboarding ? {} : { visibility: 'hidden' }} />
                <div id="hidden_iframe_div" ref={hidden_iframe_div} style={{ visibility: 'hidden' }} />

                <div id="loginFrm_div" style={{ visibility: 'hidden' }}>
                    <form ref={loginFrm} id="loginFrm" method="POST" target="hidden_iframe" action={`${connectInstanceURL}/auth/sign-in`} onSubmit={handleLogin}>
                        <label htmlFor="credentials">Credentials:</label>
                        <input type="text" name="credentials" id="credentials" value={credentials} onChange={(e) => { setCredentials(e.target.value) }} /><br />
                        <label htmlFor="destination">Destination:</label>
                        <input type="text" name="destination" id="destination" value={destination} onChange={(e) => { setDestination(e.target.value) }} /><br />
                    </form>
                </div>
            </div>

            {isError && (<div id="errorMessage">
                <Modal size="md" onClose={closeError}>
                    <ModalHeader title={`Amazon Connect Login`} />
                    <ModalBody>
                        <Card
                            title="Unable to login"
                            description="There was an issue with Amazon Connect login"
                            smallText={errorMessage}
                        />
                    </ModalBody>
                </Modal>
            </div>)}
        </>
    );
}

export default CCP;