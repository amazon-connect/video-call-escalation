const crypto = require('crypto');

exports.validateEmailAddress = (email) => {
    const emailRegEx = /^[^\s@]+@[^\s@]+$/
    return emailRegEx.test(email)
}

exports.createNumericHash = (value, key) => {
    const hexHash = crypto.createHmac('sha256', key).update(value).digest('hex')
    const intHash = Number(`0x${hexHash}`)
    const numHash = intHash % 10**8
    return { numHash, hexHash }
}