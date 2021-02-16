// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import {
  SpeakerSelection,
  useAudioOutputs
} from 'amazon-chime-sdk-component-library-react';

const SpeakerDevices = () => {
  const { selectedDevice } = useAudioOutputs();
  const [, setSelectedOutput] = useState(selectedDevice);

  const handleChange = (deviceId) => {
    setSelectedOutput(deviceId);
  };


  return (
    <div>
      <SpeakerSelection onChange={handleChange} />
    </div>
  );
};

export default SpeakerDevices;