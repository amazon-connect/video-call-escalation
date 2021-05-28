// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export const infoMessage = (message) => {
    return { info: message }
}

export const errorMessage = (message) => {
    return { error: message }
}

export const rejectMessage = (message) => {
    return { reject: message }
}
