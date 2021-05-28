// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useNotificationDispatch } from 'amazon-chime-sdk-component-library-react';

export default function useNotificationHelper() {

    const dispatch = useNotificationDispatch();

    const notificationInformation = (messageText, autoCloseDelay = 5000) => {
        dispatch({
            type: 0,
            payload: {
                message: messageText,
                severity: 'success',
                autoClose: true,
                autoCloseDelay: autoCloseDelay
            },
        });
    }

    const notificationError = (messageTest) => {
        dispatch({
            type: 0,
            payload: {
                message: messageTest,
                severity: 'error',
                autoClose: false,
            },
        });
    }

    const notificationReject = (messageText, autoCloseDelay = 3000) => {
        dispatch({
            type: 0,
            payload: {
                message: messageText,
                severity: 'warning',
                autoClose: true,
                autoCloseDelay: autoCloseDelay
            },
        });
    }

    const displayNotification = (notification) => {
        if (notification.error) {
            notificationError(notification.error);
        }
        else if (notification.reject) {
            notificationReject(notification.reject);
        }
        else {
            notificationInformation(notification.info);
        }
    }

    return {
        displayNotification
    }

}