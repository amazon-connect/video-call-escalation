// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Heading, Spinner } from 'amazon-chime-sdk-component-library-react';
import React from 'react';
import CCP from '../../containers/CCP'

const Onboarding = () => {

    return (
        <>
            <Heading tag="h2" level={4} css="margin-bottom: 1rem">Please wait while we onboard your profile...<Spinner width="2rem" height="2rem" /></Heading>
            <CCP isOnboarding={true} />
        </>
    )
}

export default Onboarding;