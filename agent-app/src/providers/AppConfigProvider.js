// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext } from 'react';
import { SDK_LOG_LEVELS, DeprecatedConnectDomain } from '../constants';

const AppConfigContext = React.createContext(null);

export function useAppConfig() {
    const config = useContext(AppConfigContext);

    if (!config) throw new Error('useAppConfig must be used within AppConfigProvider');

    return config;
}

export function AppConfigProvider({ vceConfig, children }) {

    const cognitoSAMLEnabled = getBoolParamValue(vceConfig.cognitoSAMLEnabled);
    const connectInstanceARN = getParamValue(vceConfig.connectInstanceARN);
    const connectInstanceRegion = getParamValue(vceConfig.connectInstanceARN)?.split(':')[3];
    const cognitoSAMLIdentityProviderName = getParamValue(vceConfig.cognitoSAMLIdentityProviderName)
    const websiteAdHocRouteBaseURL = getParamValue(vceConfig.websiteAdHocRouteBaseURL)

    let connectInstanceURL = getParamValue(vceConfig.connectInstanceURL);
    //to support existing instance that are not on my.connect.aws domain
    if (connectInstanceURL.endsWith(DeprecatedConnectDomain)) connectInstanceURL = `${connectInstanceURL}/connect`

    const deployRecordingStack = getBoolParamValue(vceConfig.deployRecordingStack);
    const recordingAttendeeName = getParamValue(vceConfig.recordingAttendeeName);

    const meetingManagerConfig = {
        logLevel: SDK_LOG_LEVELS.warn //TODO: Implement a parameter
    }

    const recordingManagerConfig = {
        deployRecordingStack: deployRecordingStack,
        recordingAttendeeName: recordingAttendeeName
    }

    const providerValue = {
        connectInstanceURL,
        connectInstanceARN,
        connectInstanceRegion,
        meetingManagerConfig,
        recordingManagerConfig,
        cognitoSAMLEnabled,
        cognitoSAMLIdentityProviderName,
        websiteAdHocRouteBaseURL,
        deployRecordingStack,
        recordingAttendeeName
    }

    return (
        <AppConfigContext.Provider value={providerValue}>
            {children}
        </AppConfigContext.Provider>
    );

}

function getParamValue(param) {
    const SSM_NOT_DEFINED = 'not-defined'
    if (param === SSM_NOT_DEFINED) return undefined
    return param
}

function getBoolParamValue(param) {
    return param === "true"
}