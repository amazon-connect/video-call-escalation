// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as ChimeSDK from 'amazon-chime-sdk-js'

if (window.global === undefined) window.global = window;

/* *** COLLECT PARAMETERS PROVIDED IN THE MEETING URL *** */
const urlParams = new URLSearchParams(window.location.search);

/* *** SETUP A DEVICE CONTROLLER WITH LOGGER *** */
const logger = new ChimeSDK.ConsoleLogger(
    "ChimeMeetingLogs",
    ChimeSDK.LogLevel.INFO
);
const deviceController = new ChimeSDK.DefaultDeviceController(logger);

function displayExternalMeetingId(externalMeetingId) {
    document.getElementById('h3Title').innerHTML = `Video Call Recording for: ${externalMeetingId}`;
}

/* *** THIS METHOD JOINS THE MEETING BASED ON THE MEETING ID AND API URL PROVIDED *** */
async function start() {
    if (window.meetingSession) {
        console.info('MeetingSession already exists');
        return
    }

    const chimeMeetingDataEncoded = urlParams.get("chimeMeetingData");
    if (!chimeMeetingDataEncoded) {
        console.error(`URL Parameter missing: chimeMeetingData`);
        return
    }

    const chimeAttendeeDataEncoded = urlParams.get("chimeAttendeeData");
    if (!chimeAttendeeDataEncoded) {
        console.error(`URL Parameter missing: chimeAttendeeData`);
    }

    try {

        const chimeMeetingData = JSON.parse(atob(chimeMeetingDataEncoded));
        const chimeAttendeeData = JSON.parse(atob(chimeAttendeeDataEncoded));

        displayExternalMeetingId(chimeMeetingData.ExternalMeetingId);

        const configuration = new ChimeSDK.MeetingSessionConfiguration(
            chimeMeetingData,
            chimeAttendeeData,
        );
        window.meetingSession = new ChimeSDK.DefaultMeetingSession(
            configuration,
            logger,
            deviceController
        );


        const observer = {
            // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
            videoTileDidUpdate: (tileState) => {
                console.info("Video tile updated...");
                console.info(tileState);
                // Ignore a tile without attendee ID and other attendee's tile.
                if (!tileState.boundAttendeeId) {
                    return;
                }
                updateTiles(window.meetingSession);
            },
        };

        await window.meetingSession.audioVideo.addObserver(observer);

        const audioOutputElement = document.getElementById("meeting-audio");
        await window.meetingSession.audioVideo.bindAudioElement(audioOutputElement);
        await window.meetingSession.audioVideo.start();
    } catch (err) {
        console.error("Error occurred: ", err.message)
    }
}

/* *** THIS METHOD ARRANGES THE VIDEO ELEMENTS ON THE MEETING HOMEPAGE *** */
function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    console.info("tiles", tiles);
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId
        let attendeeId = tile.tileState.boundAttendeeId
        var videoElement = document.getElementById("video-" + tileId);
        var videoElementByAttendeeId = document.querySelector(`[attendee-id='${attendeeId}']`);

        if (!videoElement) {
            if (videoElementByAttendeeId !== null) {
                videoElementByAttendeeId.remove();
            }
            videoElement = document.createElement("video");
            videoElement.id = "video-" + tileId;
            videoElement.setAttribute("attendee-id", attendeeId);
            document.getElementById("video-list").append(videoElement);
            meetingSession.audioVideo.bindVideoElement(
                tileId,
                videoElement
            );
        }
    })
}

window.addEventListener("DOMContentLoaded", () => {
    start();
});
