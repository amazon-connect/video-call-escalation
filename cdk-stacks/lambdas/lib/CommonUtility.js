// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const validateEmailAddress = (email) => {
    const emailRegEx = /^[^\s@]+@[^\s@]+$/
    return emailRegEx.test(email)
}

const getUTCYearMonthDayHourMinuteSecond = (date) => {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${date.getUTCDate()}`.padStart(2, "0");
    const hour = `${date.getUTCHours()}`.padStart(2, "0");
    const minute = `${date.getUTCMinutes()}`.padStart(2, "0");
    const second = `${date.getUTCSeconds()}`.padStart(2, "0");

    return { year, month, day, hour, minute, second };
}

const getPathFromDate = (date) => {
    const { year, month, day, hour } = getUTCYearMonthDayHourMinuteSecond(date);
    return `${year}/${month}/${day}/${hour}/`;
}

const getFileTimestampFromDate = (date) => {
    const { year, month, day, hour, minute, second } = getUTCYearMonthDayHourMinuteSecond(date);
    return `${year}${month}${day}T${hour}:${minute}:${second}_UTC`;
}

const makeComparator = (key, order = 'asc') => {
    return (a, b) => {
        if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key)) return 0;

        const aVal = ((typeof a[key] === 'string') ? a[key].toUpperCase() : a[key]);
        const bVal = ((typeof b[key] === 'string') ? b[key].toUpperCase() : b[key]);

        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;

        return order === 'desc' ? (comparison * -1) : comparison
    };
}

const convertHierarchyLevelId = (levelId) => {
    const levels = ['LevelOne', 'LevelTwo', 'LevelThree', 'LevelFour', 'LevelFive'];
    return levels[parseInt(levelId) - 1];
}

const wait = (time) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time);
    });
}

module.exports = {
    uuid,
    validateEmailAddress,
    getPathFromDate,
    getFileTimestampFromDate,
    makeComparator,
    convertHierarchyLevelId,
    wait
}