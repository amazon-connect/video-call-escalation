// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useEffect, useState } from 'react';
import { useMeetingManager } from 'amazon-chime-sdk-component-library-react';

import { DevicePermissionStatus } from '../constants';

export default function useDevicePermissionStatus() {
  const meetingManager = useMeetingManager();
  const [permission, setPermission] = useState(
    DevicePermissionStatus.UNSET
  );

  useEffect(() => {
    const callback = (updatedPermission) => {
      setPermission(updatedPermission);
    };
    meetingManager.subscribeToDevicePermissionStatus(callback);
    return () => {
      meetingManager.unsubscribeFromDevicePermissionStatus(callback);
    };
  }, [meetingManager]);

  return permission;
}