// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const crypto = require('crypto');


const createNumericHash = (value, key) => {
    const hexHash = crypto.createHmac('sha256', key).update(value).digest('hex')
    const intHash = Number(`0x${hexHash}`)
    const numHash = intHash % 10 ** 8
    return { numHash, hexHash }
}


module.exports = {
    createNumericHash
}