// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext } from 'react';
import cdkExports from '../cdk-exports.json'
import { SDK_LOG_LEVELS } from '../constants';

const AppConfigContext = React.createContext(null);

export function useAppConfig(){
    const config = useContext(AppConfigContext);

    if(!config) throw new Error('useAppConfig must be used within AppConfigProvider');

    return config;
}

export function AppConfigProvider({children}) {
    const connectInstanceURL = cdkExports.VideoCallEscalationStack.connectInstanceURL;
    const connectInstanceARN = cdkExports.VideoCallEscalationStack.connectInstanceARN;
    const connectInstanceRegion = cdkExports.VideoCallEscalationStack.connectInstanceARN.split(':')[3];

    const cognitoSAMLEnabled = cdkExports.VideoCallEscalationStack.cognitoSAMLEnabled === "true";
    const cognitoSAMLIdentityProviderName = cdkExports.VideoCallEscalationStack.cognitoSAMLIdentityProviderName
    

    const meetingManagerConfig = {
        logLevel : SDK_LOG_LEVELS.warn //TODO: Implement a parameter
    }

    const providerValue = {
        connectInstanceURL,
        connectInstanceARN,
        connectInstanceRegion,
        meetingManagerConfig,
        cognitoSAMLEnabled,
        cognitoSAMLIdentityProviderName
    }

    return(
        <AppConfigContext.Provider value={providerValue}>
            {children}
        </AppConfigContext.Provider>
    );

}