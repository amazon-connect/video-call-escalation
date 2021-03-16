// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext } from 'react';
import cdkExports from '../cdk-exports.json'
import { SDK_LOG_LEVELS, DeprecatedConnectDomain } from '../constants';

const AppConfigContext = React.createContext(null);

export function useAppConfig(){
    const config = useContext(AppConfigContext);

    if(!config) throw new Error('useAppConfig must be used within AppConfigProvider');

    return config;
}

export function AppConfigProvider({children}) {

    const cognitoSAMLEnabled = getBoolParamValue(cdkExports.VideoCallEscalationStack.cognitoSAMLEnabled);
    const connectInstanceARN = getParamValue(cdkExports.VideoCallEscalationStack.connectInstanceARN);
    const connectInstanceRegion = getParamValue(cdkExports.VideoCallEscalationStack.connectInstanceARN)?.split(':')[3];
    const cognitoSAMLIdentityProviderName = getParamValue(cdkExports.VideoCallEscalationStack.cognitoSAMLIdentityProviderName)
    const websiteAdHocRouteBaseURL = getParamValue(cdkExports.VideoCallEscalationStack.websiteAdHocRouteBaseURL)
    
    let connectInstanceURL = getParamValue(cdkExports.VideoCallEscalationStack.connectInstanceURL);
    //to support existing instance that are not on my.connect.aws domain
    if (connectInstanceURL.endsWith(DeprecatedConnectDomain)) connectInstanceURL = `${connectInstanceURL}/connect`

    const meetingManagerConfig = {
        logLevel : SDK_LOG_LEVELS.warn //TODO: Implement a parameter
    }

    const providerValue = {
        connectInstanceURL,
        connectInstanceARN,
        connectInstanceRegion,
        meetingManagerConfig,
        cognitoSAMLEnabled,
        cognitoSAMLIdentityProviderName,
        websiteAdHocRouteBaseURL
    }

    return(
        <AppConfigContext.Provider value={providerValue}>
            {children}
        </AppConfigContext.Provider>
    );

}

function getParamValue(param){
    const SSM_NOT_DEFINED = 'not-defined'
    if(param === SSM_NOT_DEFINED) return undefined
    return param
}

function getBoolParamValue(param){
    return param === "true"
}