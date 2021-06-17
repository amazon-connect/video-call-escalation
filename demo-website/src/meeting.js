// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import './style.scss';
import './amazon-connect-chat-interface.js';
import 'bootstrap';
import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';

const uuidv4 = require('uuid/v4')

const vceConfig = window.vceConfig;

import {
    AsyncScheduler,
    ConsoleLogger,
    DefaultActiveSpeakerPolicy,
    DefaultAudioMixController,
    DefaultDeviceController,
    DefaultMeetingSession,
    LogLevel,
    MeetingSessionConfiguration,
    TimeoutScheduler,
    MeetingSessionStatusCode
} from 'amazon-chime-sdk-js'


class DemoTileOrganizer {
    static MAX_TILES = 16;
    tiles = {};

    acquireTileIndex(tileId) {
        for (let index = 0; index < DemoTileOrganizer.MAX_TILES; index++) {
            if (this.tiles[index] === tileId) {
                return index;
            }
        }
        for (let index = 0; index < DemoTileOrganizer.MAX_TILES; index++) {
            if (!(index in this.tiles)) {
                this.tiles[index] = tileId;
                return index;
            }
        }
        throw new Error('no tiles are available');
    }

    releaseTileIndex(tileId) {
        for (let index = 0; index < DemoTileOrganizer.MAX_TILES; index++) {
            if (this.tiles[index] === tileId) {
                delete this.tiles[index];
                return index;
            }
        }
        return DemoTileOrganizer.MAX_TILES;
    }
}

class TestSound {
    constructor(
        sinkId = null,
        frequency = 440,
        durationSec = 1,
        rampSec = 0.1,
        maxGainValue = 0.1
    ) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        const oscillatorNode = audioContext.createOscillator();
        oscillatorNode.frequency.value = frequency;
        oscillatorNode.connect(gainNode);
        const destinationStream = audioContext.createMediaStreamDestination();
        gainNode.connect(destinationStream);
        const currentTime = audioContext.currentTime;
        const startTime = currentTime + 0.1;
        gainNode.gain.linearRampToValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(maxGainValue, startTime + rampSec);
        gainNode.gain.linearRampToValueAtTime(maxGainValue, startTime + rampSec + durationSec);
        gainNode.gain.linearRampToValueAtTime(0, startTime + rampSec * 2 + durationSec);
        oscillatorNode.start();
        const audioMixController = new DefaultAudioMixController();

        audioMixController.bindAudioDevice({ deviceId: sinkId });
        audioMixController.bindAudioElement(new Audio());
        audioMixController.bindAudioStream(destinationStream.stream);
        new TimeoutScheduler((rampSec * 2 + durationSec + 1) * 1000).start(() => {
            audioContext.close();
        });
    }
}

export class DemoMeetingApp {
    showActiveSpeakerScores = true;
    activeSpeakerLayout = true;
    externalMeetingId = null;
    attendeeName = null;
    attendeeExternalUserId = null;
    attendeeEmail = null;
    meetingRegion = null;
    referenceId = null;
    referenceIdQueryParam = null;
    referenceEmailQueryParam = null;

    static MeetingAPI = vceConfig.meetingAPI;

    meetingSession = null;
    audioVideo = null;
    tileOrganizer = new DemoTileOrganizer();
    canStartLocalVideo = true;

    roster = {};
    tileIndexToTileId = {};
    tileIdToTileIndex = {};

    buttonStates = {
        'button-microphone': true,
        'button-camera': false,
        'button-speaker': true,
        'button-screen-share': false,
        'button-screen-view': false,
    };

    connectProvider = {}

    constructor() {
        global.app = this;
        this.switchToFlow('flow-authenticate');
        this.initEventListeners();
        this.initParameters();
        this.connectProvider = new ConnectProvider(this);
        this.connectProvider.initConnect();
    }

    initParameters() {
        this.referenceIdQueryParam = new URL(window.location.href).searchParams.get('refId');
        this.referenceEmailQueryParam = new URL(window.location.href).searchParams.get('refEm');

        document.getElementById('inputExternalMeetingId').value = uuidv4();
        document.getElementById('inputAttendeeName').focus();

        document.getElementById('roster-wrapper').style.display = 'none';
        document.getElementById('end-wrapper').style.display = 'none';
        document.getElementById('video-uplink-bandwidth').style.display = 'none';
        document.getElementById('video-downlink-bandwidth').style.display = 'none';
        document.getElementById('video-wrapper').classList.add('video-wrapper');

        document.getElementById('content').classList.add('content');

        $("#content").draggable({
            handle: ".content-handle"
        });
        $("#connect-wrapper").draggable({
            handle: ".header-wrapper"
        });
        $("#video-wrapper").draggable({
            handle: ".video-wrapper-handle"
        });

        if (this.referenceIdQueryParam) {
            window.history.replaceState(null, null, window.location.pathname)
            document.getElementById('inputReferenceId').value = this.referenceIdQueryParam
            if (this.referenceEmailQueryParam) {
                document.getElementById('inputAttendeeEmail').value = this.referenceEmailQueryParam
            }
            document.getElementById('content').style.display = 'flex'
        }

    }

    initEventListeners() {
        window.addEventListener('resize', () => {
            this.layoutVideoTiles();
        });

        document.getElementById('form-authenticate').addEventListener('submit', e => {
            e.preventDefault();
            this.startConnectChat();
        });

        const audioInput = document.getElementById('audio-input');
        audioInput.addEventListener('change', async (_ev) => {
            this.log('audio input device is changed');
            await this.openAudioInputFromSelection();
        });

        const videoInput = document.getElementById('video-input');
        videoInput.addEventListener('change', async (_ev) => {
            this.log('Video input device is changed');
            await this.openVideoInputFromSelection(videoInput.value, true);
        });

        const videoInputQuality = document.getElementById('video-input-quality');
        videoInputQuality.addEventListener('change', async (_ev) => {
            this.log('Video input quality is changed');
            switch (videoInputQuality.value) {
                case '360p':
                    this.audioVideo.chooseVideoInputQuality(640, 360, 15, 600);
                    break;
                case '540p':
                    this.audioVideo.chooseVideoInputQuality(960, 540, 15, 1400);
                    break;
                case '720p':
                    this.audioVideo.chooseVideoInputQuality(1280, 720, 15, 1400);
                    break;
            }
            await this.openVideoInputFromSelection(videoInput.value, true);
        });

        const audioOutput = document.getElementById('audio-output');
        audioOutput.addEventListener('change', async (_ev) => {
            this.log('audio output device is changed');
            await this.openAudioOutputFromSelection();
        });

        document.getElementById('button-test-sound').addEventListener('click', e => {
            e.preventDefault();
            const audioOutput = document.getElementById('audio-output');
            new TestSound(audioOutput.value);
        });

        document.getElementById('form-devices').addEventListener('submit', e => {
            e.preventDefault();
            new AsyncScheduler().start(async () => {
                try {
                    this.showProgress('progress-join');
                    await this.join();
                    this.audioVideo.stopVideoPreviewForVideoInput(document.getElementById('video-preview'));
                    this.audioVideo.chooseVideoInputDevice(null);
                    this.hideProgress('progress-join');
                    this.displayButtonStates();
                    this.switchToFlow('flow-meeting');

                    document.getElementById('content').style.display = 'none';
                } catch (error) {
                    console.error(error);
                    document.getElementById('failed-join').innerHTML = `Meeting ID: ${this.externalMeetingId}`;
                    document.getElementById('failed-join-error').innerHTML = `Error: ${error.message}`;
                }
            });
        });

        const buttonMute = document.getElementById('button-microphone');
        buttonMute.addEventListener('mousedown', _e => {
            if (this.toggleButton('button-microphone')) {
                this.audioVideo.realtimeUnmuteLocalAudio();
            } else {
                this.audioVideo.realtimeMuteLocalAudio();
            }
        });

        const buttonVideo = document.getElementById('button-camera');
        buttonVideo.addEventListener('click', _e => {
            new AsyncScheduler().start(async () => {
                if (this.toggleButton('button-camera') && this.canStartLocalVideo) {
                    await this.openVideoInputFromSelection(null, false);
                    this.audioVideo.startLocalVideoTile();
                } else {
                    this.audioVideo.stopLocalVideoTile();
                    this.hideTile(16);
                }
            });
        });

        const buttonScreenShare = document.getElementById('button-screen-share');
        buttonScreenShare.addEventListener('click', _e => {
            new AsyncScheduler().start(async () => {
                if (this.toggleButton('button-screen-share')) {
                    this.audioVideo.startContentShareFromScreenCapture();
                } else {
                    this.audioVideo.stopContentShare();
                }
            });
        });

        const buttonSpeaker = document.getElementById('button-speaker');
        buttonSpeaker.addEventListener('click', _e => {
            new AsyncScheduler().start(async () => {
                if (this.toggleButton('button-speaker')) {
                    this.audioVideo.bindAudioElement(document.getElementById('meeting-audio'));
                } else {
                    this.audioVideo.unbindAudioElement();
                }
            });
        });

        const buttonMeetingEnd = document.getElementById('button-meeting-end');
        buttonMeetingEnd.addEventListener('click', _e => {
            new AsyncScheduler().start(async () => {
                buttonMeetingEnd.disabled = true;
                this.leave();
                buttonMeetingEnd.disabled = false;

                window.location = window.location.pathname;
            });
        });

        const buttonMeetingLeave = document.getElementById('button-meeting-leave');
        buttonMeetingLeave.addEventListener('click', _e => {
            new AsyncScheduler().start(async () => {
                buttonMeetingLeave.disabled = true;
                this.leave();
                buttonMeetingLeave.disabled = false;

                window.location = window.location.pathname;
            });
        });

        const buttonStartVideo = document.getElementById('start-video-button');
        buttonStartVideo.addEventListener('click', _e => {
            this.log('buttonStartVideo click');
            if (document.getElementById('content').style.display === 'none') {
                document.getElementById('content').style.display = 'flex';
            }
            else {
                document.getElementById('content').style.display = 'none';
            }
        });

        const buttonExpandReference = document.getElementById('button-expand-reference');
        buttonExpandReference.firstElementChild.nextElementSibling.style.display = 'none'
        buttonExpandReference.addEventListener('click', _e => {
            const divExpandReference = document.getElementById('div-expand-reference')
            if (divExpandReference.style.display === 'none') {
                divExpandReference.style.display = 'block'
                divExpandReference.classList.add('mb-3')
                buttonExpandReference.firstElementChild.style.display = 'none'
                buttonExpandReference.firstElementChild.nextElementSibling.style.display = 'inline'
            }
            else {
                divExpandReference.style.display = 'none'
                buttonExpandReference.firstElementChild.nextElementSibling.style.display = 'none'
                buttonExpandReference.firstElementChild.style.display = 'inline'
            }
        })
    }

    toggleButton(button) {
        this.buttonStates[button] = !this.buttonStates[button];
        this.displayButtonStates();
        return this.buttonStates[button];
    }

    displayButtonStates() {
        for (const button in this.buttonStates) {
            const element = document.getElementById(button);
            const drop = document.getElementById(`${button}-drop`);
            const on = this.buttonStates[button];
            element.classList.add(on ? 'btn-success' : 'btn-outline-secondary');
            element.classList.remove(on ? 'btn-outline-secondary' : 'btn-success');
            element.firstElementChild.classList.add(on ? 'svg-active' : 'svg-inactive');
            element.firstElementChild.classList.remove(on ? 'svg-inactive' : 'svg-active');
            if (drop) {
                drop.classList.add(on ? 'btn-success' : 'btn-outline-secondary');
                drop.classList.remove(on ? 'btn-outline-secondary' : 'btn-success');
            }
        }
    }

    showProgress(id) {
        document.getElementById(id).style.visibility = 'visible';
    }

    hideProgress(id) {
        document.getElementById(id).style.visibility = 'hidden';
    }

    switchToFlow(flow) {
        this.analyserNodeCallback = () => { };
        Array.from(document.getElementsByClassName('flow')).map(e => (e.style.display = 'none'));
        document.getElementById(flow).style.display = 'block';
        if (flow == 'flow-authenticate') {
            document.getElementById('header-title-authenticate').style.display = 'block'
        }
        if (flow === 'flow-devices') {
            this.startAudioPreview();
        }
    }

    audioInputsChanged(_freshAudioInputDeviceList) {
        this.populateAudioInputList();
    }

    videoInputsChanged(_freshVideoInputDeviceList) {
        this.populateVideoInputList();
    }

    audioOutputsChanged(_freshAudioOutputDeviceList) {
        this.populateAudioOutputList();
    }

    metricsDidReceive(clientMetricReport) {
        const metricReport = clientMetricReport.getObservableMetrics();
        const availableSendBandwidth = metricReport.availableSendBandwidth;
        const availableRecvBandwidth = metricReport.availableReceiveBandwidth;
        if (typeof availableSendBandwidth === 'number' && !isNaN(availableSendBandwidth)) {
            document.getElementById('video-uplink-bandwidth').innerHTML = 'Available Uplink Bandwidth: ' + String(availableSendBandwidth / 1000) + ' Kbps';
        } else {
            document.getElementById('video-uplink-bandwidth').innerHTML = 'Available Uplink Bandwidth: Unknown';
        }
        if (typeof availableRecvBandwidth === 'number' && !isNaN(availableRecvBandwidth)) {
            document.getElementById('video-downlink-bandwidth').innerHTML = 'Available Downlink Bandwidth: ' + String(availableRecvBandwidth / 1000) + ' Kbps';
        } else {
            document.getElementById('video-downlink-bandwidth').innerHTML = 'Available Downlink Bandwidth: Unknown';
        }
    }

    async initializeMeetingSession(configuration) {
        const logger = new ConsoleLogger('SDK', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        this.meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
        this.audioVideo = this.meetingSession.audioVideo;
        this.audioVideo.addDeviceChangeObserver(this);
        await this.setupDeviceLabelTrigger();
        await this.populateAllDeviceLists();
        await this.setupMuteHandler();
        await this.setupCanUnmuteHandler();
        await this.setupSubscribeToAttendeeIdPresenceHandler();
        await this.audioVideo.addObserver(this);
        await this.audioVideo.addContentShareObserver(this);
    }

    async join() {
        await this.openAudioInputFromSelection();
        await this.openAudioOutputFromSelection();
        this.audioVideo.start();
    }

    leave() {
        if (this.meetingSession) {
            this.audioVideo.stop();
            this.roster = {};
        }
    }

    setupMuteHandler() {
        const handler = (isMuted) => {
            this.log(`muted = ${isMuted}`);
        };
        this.audioVideo.realtimeSubscribeToMuteAndUnmuteLocalAudio(handler);
        const isMuted = this.audioVideo.realtimeIsLocalAudioMuted();
        handler(isMuted);
    }

    setupCanUnmuteHandler() {
        const handler = (canUnmute) => {
            this.log(`canUnmute = ${canUnmute}`);
        };
        this.audioVideo.realtimeSubscribeToSetCanUnmuteLocalAudio(handler);
        handler(this.audioVideo.realtimeCanUnmuteLocalAudio());
    }

    updateRoster() {
        let rosterText = '';
        for (const attendeeId in this.roster) {
            rosterText +=
                '<li class="list-group-item d-flex justify-content-between align-items-center">';
            rosterText += this.roster[attendeeId].name;
            let score = this.roster[attendeeId].score;
            if (!score) {
                score = 0;
            }
            score = Math.floor(score * 100);
            if (score) {
                rosterText += ` (${score})`
            }
            rosterText += '<span class="badge badge-pill ';
            let status = '';
            if (this.roster[attendeeId].signalStrength < 1) {
                status = '&nbsp;';
                rosterText += 'badge-warning';
            } else if (this.roster[attendeeId].signalStrength === 0) {
                status = '&nbsp;';
                rosterText += 'badge-danger';
            } else if (this.roster[attendeeId].muted) {
                status = 'MUTED';
                rosterText += 'badge-secondary';
            } else if (this.roster[attendeeId].active) {
                status = 'SPEAKING';
                rosterText += 'badge-success';
            } else if (this.roster[attendeeId].volume > 0) {
                status = '&nbsp;';
                rosterText += 'badge-success';
            }
            rosterText += `">${status}</span></li>`;
        }
        const roster = document.getElementById('roster');
        if (roster.innerHTML !== rosterText) {
            roster.innerHTML = rosterText;
        }
    }

    setupSubscribeToAttendeeIdPresenceHandler() {
        const handler = (attendeeId, present, externalUserId) => {
            this.log(`attendeeId:${attendeeId} | externalUserId:${externalUserId} | present = ${present}`);

            //add externalUserId to roster
            if (!this.roster[attendeeId]) {
                this.roster[attendeeId] = { externalUserId: externalUserId };

            }

            if (!present) {
                delete this.roster[attendeeId];
                this.updateRoster();
                return;
            }


            this.audioVideo.realtimeSubscribeToVolumeIndicator(
                attendeeId,
                async (attendeeId, volume, muted, signalStrength) => {
                    if (volume !== null) {
                        this.roster[attendeeId].volume = Math.round(volume * 100);
                    }
                    if (muted !== null) {
                        this.roster[attendeeId].muted = muted;
                    }
                    if (signalStrength !== null) {
                        this.roster[attendeeId].signalStrength = Math.round(signalStrength * 100);
                    }
                    if (!this.roster[attendeeId].name) {
                        this.roster[attendeeId].name = 'Loading'
                        const response = await fetch(`${DemoMeetingApp.MeetingAPI}attendee-name?externalMeetingId=${encodeURIComponent(this.externalMeetingId)}&attendeeExternalUserId=${encodeURIComponent(this.roster[attendeeId].externalUserId)}`);
                        const jsonResponse = await response.json();
                        this.roster[attendeeId].name = jsonResponse.data ? jsonResponse.data : '';
                    }
                    this.updateRoster();
                }
            );
        };
        this.audioVideo.realtimeSubscribeToAttendeeIdPresence(handler);
        const activeSpeakerHandler = (attendeeIds) => {
            for (const attendeeId in this.roster) {
                this.roster[attendeeId].active = false;
            }
            for (const attendeeId of attendeeIds) {
                this.roster[attendeeId].active = true;
                break; // only show the most active speaker
            }
            this.layoutVideoTiles();
        };
        this.audioVideo.subscribeToActiveSpeakerDetector(
            new DefaultActiveSpeakerPolicy(),
            activeSpeakerHandler,
            (scores) => {
                for (const attendeeId in scores) {
                    if (this.roster[attendeeId]) {
                        this.roster[attendeeId].score = scores[attendeeId];
                    }
                }
                this.updateRoster();
            },
            this.showActiveSpeakerScores ? 100 : 0,
        );
    }

    setupDeviceLabelTrigger() {
        // Note that device labels are privileged since they add to the
        // fingerprinting surface area of the browser session. In Chrome private
        // tabs and in all Firefox tabs, the labels can only be read once a
        // MediaStream is active. How to deal with this restriction depends on the
        // desired UX. The device controller includes an injectable device label
        // trigger which allows you to perform custom behavior in case there are no
        // labels, such as creating a temporary audio/video stream to unlock the
        // device names, which is the default behavior. Here we override the
        // trigger to also show an alert to let the user know that we are asking for
        // mic/camera permission.
        //
        // Also note that Firefox has its own device picker, which may be useful
        // for the first device selection. Subsequent device selections could use
        // a custom UX with a specific device id.
        this.audioVideo.setDeviceLabelTrigger(
            async () => {
                this.switchToFlow('flow-need-permission');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                this.switchToFlow('flow-devices');
                return stream;
            }
        );
    }

    populateDeviceList(elementId, genericName, devices, additionalOptions) {
        const list = document.getElementById(elementId);
        while (list.firstElementChild) {
            list.removeChild(list.firstElementChild);
        }
        for (let i = 0; i < devices.length; i++) {
            const option = document.createElement('option');
            list.appendChild(option);
            option.text = devices[i].label || `${genericName} ${i + 1}`;
            option.value = devices[i].deviceId;
        }
        if (additionalOptions.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.text = '──────────';
            list.appendChild(separator);
            for (const additionalOption of additionalOptions) {
                const option = document.createElement('option');
                list.appendChild(option);
                option.text = additionalOption;
                option.value = additionalOption;
            }
        }
        if (!list.firstElementChild) {
            const option = document.createElement('option');
            option.text = 'Device selection unavailable';
            list.appendChild(option);
        }
    }

    populateInMeetingDeviceList(elementId, genericName, devices, additionalOptions, callback) {
        const menu = document.getElementById(elementId);
        while (menu.firstElementChild) {
            menu.removeChild(menu.firstElementChild);
        }
        for (let i = 0; i < devices.length; i++) {
            this.createDropdownMenuItem(menu, devices[i].label || `${genericName} ${i + 1}`, () => {
                callback(devices[i].deviceId);
            });
        }
        if (additionalOptions.length > 0) {
            this.createDropdownMenuItem(menu, '──────────', () => { }).classList.add('text-center');
            for (const additionalOption of additionalOptions) {
                this.createDropdownMenuItem(
                    menu,
                    additionalOption,
                    () => {
                        callback(additionalOption);
                    },
                    `${elementId}-${additionalOption.replace(/\s/g, '-')}`
                );
            }
        }
        if (!menu.firstElementChild) {
            this.createDropdownMenuItem(menu, 'Device selection unavailable', () => { });
        }
    }

    createDropdownMenuItem(menu, title, clickHandler, id) {
        const button = document.createElement('button');
        menu.appendChild(button);
        button.innerHTML = title;
        button.classList.add('dropdown-item');
        if (id !== undefined) {
            button.id = id;
        }
        button.addEventListener('click', () => {
            clickHandler();
        });
        return button;
    }

    async populateAllDeviceLists() {
        await this.populateAudioInputList();
        await this.populateVideoInputList();
        await this.populateAudioOutputList();
    }

    async populateAudioInputList() {
        const genericName = 'Microphone';
        const additionalDevices = ['None', '440 Hz'];
        this.populateDeviceList(
            'audio-input',
            genericName,
            await this.audioVideo.listAudioInputDevices(),
            additionalDevices
        );
        this.populateInMeetingDeviceList(
            'dropdown-menu-microphone',
            genericName,
            await this.audioVideo.listAudioInputDevices(),
            additionalDevices,
            async (name) => {
                await this.audioVideo.chooseAudioInputDevice(this.audioInputSelectionToDevice(name));
            }
        );
    }

    async populateVideoInputList() {
        const genericName = 'Camera';
        const additionalDevices = ['None', 'Blue', 'SMPTE Color Bars'];
        this.populateDeviceList(
            'video-input',
            genericName,
            await this.audioVideo.listVideoInputDevices(),
            additionalDevices
        );
        this.populateInMeetingDeviceList(
            'dropdown-menu-camera',
            genericName,
            await this.audioVideo.listVideoInputDevices(),
            additionalDevices,
            async (name) => {
                this.selectedVideoInput = name;
                await this.audioVideo.chooseVideoInputDevice(
                    this.videoInputSelectionToDevice(this.selectedVideoInput)
                );
            }
        );
    }

    async populateAudioOutputList() {
        const genericName = 'Speaker';
        const additionalDevices = [];
        this.populateDeviceList(
            'audio-output',
            genericName,
            await this.audioVideo.listAudioOutputDevices(),
            additionalDevices
        );
        this.populateInMeetingDeviceList(
            'dropdown-menu-speaker',
            genericName,
            await this.audioVideo.listAudioOutputDevices(),
            additionalDevices,
            async (name) => {
                await this.audioVideo.chooseAudioOutputDevice(name);
            }
        );
    }

    analyserNodeCallback = () => { };

    async openAudioInputFromSelection() {
        const audioInput = document.getElementById('audio-input');
        await this.audioVideo.chooseAudioInputDevice(
            this.audioInputSelectionToDevice(audioInput.value)
        );
        this.startAudioPreview();
    }

    setAudioPreviewPercent(percent) {
        const audioPreview = document.getElementById('audio-preview');
        if (audioPreview.getAttribute('aria-valuenow') !== `${percent}`) {
            audioPreview.style.width = `${percent}%`;
            audioPreview.setAttribute('aria-valuenow', `${percent}`);
        }
        const transitionDuration = '33ms';
        if (audioPreview.style.transitionDuration !== transitionDuration) {
            audioPreview.style.transitionDuration = transitionDuration;
        }
    }

    startAudioPreview() {
        this.setAudioPreviewPercent(0);
        const analyserNode = this.audioVideo.createAnalyserNodeForAudioInput();
        if (!analyserNode) {
            return;
        }
        if (!analyserNode.getFloatTimeDomainData) {
            document.getElementById('audio-preview').parentElement.style.visibility = 'hidden';
            return;
        }
        const data = new Float32Array(analyserNode.fftSize);
        let frameIndex = 0;
        this.analyserNodeCallback = () => {
            if (frameIndex === 0) {
                analyserNode.getFloatTimeDomainData(data);
                const lowest = 0.01;
                let max = lowest;
                for (const f of data) {
                    max = Math.max(max, Math.abs(f));
                }
                let normalized = (Math.log(lowest) - Math.log(max)) / Math.log(lowest);
                let percent = Math.min(Math.max(normalized * 100, 0), 100);
                this.setAudioPreviewPercent(percent);
            }
            frameIndex = (frameIndex + 1) % 2;
            requestAnimationFrame(this.analyserNodeCallback);
        };
        requestAnimationFrame(this.analyserNodeCallback);
    }

    async openAudioOutputFromSelection() {
        const audioOutput = document.getElementById('audio-output');
        await this.audioVideo.chooseAudioOutputDevice(audioOutput.value);
        const audioMix = document.getElementById('meeting-audio');
        await this.audioVideo.bindAudioElement(audioMix);
    }

    selectedVideoInput = null;

    async openVideoInputFromSelection(selection, showPreview) {
        if (selection) {
            this.selectedVideoInput = selection;
        }
        this.log(`Switching to Video device: ${this.selectedVideoInput}`);
        await this.audioVideo.chooseVideoInputDevice(
            this.videoInputSelectionToDevice(this.selectedVideoInput)
        );
        if (showPreview) {
            this.audioVideo.startVideoPreviewForVideoInput(document.getElementById('video-preview'));
        }
    }

    audioInputSelectionToDevice(value) {
        if (value === '440 Hz') {
            return DefaultDeviceController.synthesizeAudioDevice(440);
        } else if (value === 'None') {
            return DefaultDeviceController.createEmptyAudioDevice();
        }
        return value;
    }

    videoInputSelectionToDevice(value) {
        if (value === 'Blue') {
            return DefaultDeviceController.synthesizeVideoDevice('blue');
        } else if (value === 'SMPTE Color Bars') {
            return DefaultDeviceController.synthesizeVideoDevice('smpte');
        } else if (value === 'None') {
            return DefaultDeviceController.createEmptyVideoDevice();
        }
        return value;
    }

    log(str) {
        console.log(`[VideoCallEscalation] ${str}`);
    }


    audioVideoDidStartConnecting(reconnecting) {
        this.log(`session connecting. reconnecting: ${reconnecting}`);
    }

    audioVideoDidStart() {
        this.log('session started');
    }

    audioVideoDidStop(sessionStatus) {
        this.log(`session stopped from ${JSON.stringify(sessionStatus)}`);
        if (sessionStatus.statusCode() === MeetingSessionStatusCode.AudioCallEnded) {
            this.log(`meeting ended`);

            window.location = window.location.pathname;
        }
    }

    videoTileDidUpdate(tileState) {
        const tileIndex = tileState.localTile
            ? 16
            : this.tileOrganizer.acquireTileIndex(tileState.tileId);
        const tileElement = document.getElementById(`tile-${tileIndex}`);
        const videoElement = document.getElementById(`video-${tileIndex}`);
        const nameplateElement = document.getElementById(`nameplate-${tileIndex}`);
        this.log(`binding video tile ${tileState.tileId} to ${videoElement.id}`);
        this.audioVideo.bindVideoElement(tileState.tileId, videoElement);
        this.tileIndexToTileId[tileIndex] = tileState.tileId;
        this.tileIdToTileIndex[tileState.tileId] = tileIndex;
        // TODO: enforce roster names
        new TimeoutScheduler(2000).start(() => {
            const rosterName = this.roster[tileState.boundAttendeeId]
                ? this.roster[tileState.boundAttendeeId].name
                : '';
            if (nameplateElement.innerHTML !== rosterName) {
                nameplateElement.innerHTML = tileState.localTile ? 'Me' : rosterName;
            }
        });
        tileElement.style.display = 'block';
        this.layoutVideoTiles();
    }

    videoTileWasRemoved(tileId) {
        this.log(`video tile removed: ${tileId}`);
        this.hideTile(this.tileOrganizer.releaseTileIndex(tileId));
    }

    videoAvailabilityDidChange(availability) {
        this.canStartLocalVideo = availability.canStartLocalVideo;
        this.log(`video availability changed: canStartLocalVideo  ${availability.canStartLocalVideo}`);
    }



    hideTile(tileIndex) {
        const tileElement = document.getElementById(`tile-${tileIndex}`);
        tileElement.style.display = 'none';
        this.layoutVideoTiles();
    }

    tileIdForAttendeeId(attendeeId) {
        for (const tile of this.audioVideo.getAllVideoTiles()) {
            const state = tile.state();
            if (state.boundAttendeeId === attendeeId) {
                return state.tileId;
            }
        }
        return null;
    }

    activeTileId() {
        for (const attendeeId in this.roster) {
            if (this.roster[attendeeId].active) {
                return this.tileIdForAttendeeId(attendeeId);
            }
        }
        return null;
    }

    layoutVideoTiles() {
        if (!this.meetingSession) {
            return;
        }
        const selfAttendeeId = this.meetingSession.configuration.credentials.attendeeId;
        const selfTileId = this.tileIdForAttendeeId(selfAttendeeId);
        const visibleTileIndices = this.visibleTileIndices();
        let activeTileId = this.activeTileId();
        const selfIsVisible = visibleTileIndices.includes(this.tileIdToTileIndex[selfTileId]);
        if (visibleTileIndices.length === 2 && selfIsVisible) {
            activeTileId = this.tileIndexToTileId[
                visibleTileIndices[0] === selfTileId ? visibleTileIndices[1] : visibleTileIndices[0]
            ];
        }
        const hasVisibleActiveSpeaker = visibleTileIndices.includes(
            this.tileIdToTileIndex[activeTileId]
        );
        if (this.activeSpeakerLayout && hasVisibleActiveSpeaker) {
            this.layoutVideoTilesActiveSpeaker(visibleTileIndices, activeTileId);
        } else {
            this.layoutVideoTilesGrid(visibleTileIndices);
        }
    }

    visibleTileIndices() {
        let tiles = [];
        const screenViewTileIndex = 17;
        for (let tileIndex = 0; tileIndex <= screenViewTileIndex; tileIndex++) {
            const tileElement = document.getElementById(`tile-${tileIndex}`);
            if (tileElement.style.display === 'block') {
                if (tileIndex === screenViewTileIndex) {
                    // Hide videos when viewing screen
                    for (const tile of tiles) {
                        const tileToSuppress = document.getElementById(`tile-${tile}`);
                        tileToSuppress.style.visibility = 'hidden';
                    }
                    tiles = [screenViewTileIndex];
                } else {
                    tiles.push(tileIndex);
                }
            }
        }
        return tiles;
    }

    layoutVideoTilesActiveSpeaker(visibleTileIndices, activeTileId) {
        const tileArea = document.getElementById('tile-area');
        const width = tileArea.clientWidth;
        const height = tileArea.clientHeight;
        const widthToHeightAspectRatio = 16 / 9;
        const maximumRelativeHeightOfOthers = 0.3;

        const activeWidth = width;
        const activeHeight = width / widthToHeightAspectRatio;
        const othersCount = visibleTileIndices.length - 1;
        let othersWidth = width / othersCount;
        let othersHeight = width / widthToHeightAspectRatio;
        if (othersHeight / activeHeight > maximumRelativeHeightOfOthers) {
            othersHeight = activeHeight * maximumRelativeHeightOfOthers;
            othersWidth = othersHeight * widthToHeightAspectRatio;
        }
        if (othersCount === 0) {
            othersHeight = 0;
        }
        const totalHeight = activeHeight + othersHeight;
        const othersTotalWidth = othersWidth * othersCount;
        const othersXOffset = width / 2 - othersTotalWidth / 2;
        const activeYOffset = height / 2 - totalHeight / 2;
        const othersYOffset = activeYOffset + activeHeight;

        let othersIndex = 0;
        for (let i = 0; i < visibleTileIndices.length; i++) {
            const tileIndex = visibleTileIndices[i];
            const tileId = this.tileIndexToTileId[tileIndex];
            let x = 0,
                y = 0,
                w = 0,
                h = 0;
            if (tileId === activeTileId) {
                x = 0;
                y = activeYOffset;
                w = activeWidth;
                h = activeHeight;
            } else {
                x = othersXOffset + othersIndex * othersWidth;
                y = othersYOffset;
                w = othersWidth;
                h = othersHeight;
                othersIndex += 1;
            }
            this.updateTilePlacement(tileIndex, x, y, w, h);
        }
    }

    updateTilePlacement(tileIndex, x, y, w, h) {
        const tile = document.getElementById(`tile-${tileIndex}`);
        const insetWidthSize = 4;
        const insetHeightSize = insetWidthSize / (16 / 9);
        tile.style.position = 'absolute';
        tile.style.left = `${x + insetWidthSize}px`;
        tile.style.top = `${y + insetHeightSize}px`;
        tile.style.width = `${w - insetWidthSize * 2}px`;
        tile.style.height = `${h - insetHeightSize * 2}px`;
        tile.style.margin = '0';
        tile.style.padding = '0';
        tile.style.visibility = 'visible';
        const video = document.getElementById(`video-${tileIndex}`);
        if (video) {
            video.style.position = 'absolute';
            video.style.left = '0';
            video.style.top = '0';
            video.style.width = `${w}px`;
            video.style.height = `${h}px`;
            video.style.margin = '0';
            video.style.padding = '0';
            video.style.borderRadius = '8px';
        }
        const nameplate = document.getElementById(`nameplate-${tileIndex}`);
        const nameplateSize = 24;
        const nameplatePadding = 10;
        nameplate.style.position = 'absolute';
        nameplate.style.left = '0px';
        nameplate.style.top = `${h - nameplateSize - nameplatePadding}px`;
        nameplate.style.height = `${nameplateSize}px`;
        nameplate.style.width = `${w}px`;
        nameplate.style.margin = '0';
        nameplate.style.padding = '0';
        nameplate.style.paddingLeft = `${nameplatePadding}px`;
        nameplate.style.color = '#fff';
        nameplate.style.backgroundColor = 'rgba(0,0,0,0)';
        nameplate.style.textShadow = '0px 0px 5px black';
        nameplate.style.letterSpacing = '0.1em';
        nameplate.style.fontSize = `${nameplateSize - 6}px`;
    }

    layoutVideoTilesGrid(visibleTileIndices) {
        const tileArea = document.getElementById('tile-area');
        const width = tileArea.clientWidth;
        const height = tileArea.clientHeight;
        const widthToHeightAspectRatio = 16 / 9;
        let columns = 1;
        let totalHeight = 0;
        let rowHeight = 0;
        for (; columns < 18; columns++) {
            const rows = Math.ceil(visibleTileIndices.length / columns);
            rowHeight = width / columns / widthToHeightAspectRatio;
            totalHeight = rowHeight * rows;
            if (totalHeight <= height) {
                break;
            }
        }
        for (let i = 0; i < visibleTileIndices.length; i++) {
            const w = Math.floor(width / columns);
            const h = Math.floor(rowHeight);
            const x = (i % columns) * w;
            const y = Math.floor(i / columns) * h + (height / 2 - totalHeight / 2);
            this.updateTilePlacement(visibleTileIndices[i], x, y, w, h);
        }
    }

    contentShareDidStart() {
        this.log('content share started.');
    }

    contentShareDidStop() {
        this.log('content share stopped.');
    }

    connectionDidBecomePoor() {
        this.log('connection is poor');
    }

    connectionDidSuggestStopVideo() {
        this.log('suggest turning the video off');
    }

    videoSendDidBecomeUnavailable() {
        this.log('sending video is not available');
    }

    //-------------------------------------------------

    submitForm = () => {
        this.externalMeetingId = document.getElementById('inputExternalMeetingId').value;
        this.attendeeName = document.getElementById('inputAttendeeName').value;
        this.meetingRegion = document.getElementById('inputMeetingRegion').value;

        new AsyncScheduler().start(
            async () => {
                this.showProgress('progress-authenticate');
                try {
                    await this.authenticate();
                } catch (error) {
                    document.getElementById('failed-meeting').innerHTML = `Meeting ID: ${this.externalMeetingId}`;
                    document.getElementById('failed-meeting-error').innerHTML = error.message;
                    this.switchToFlow('flow-failed-meeting');
                    return;
                }

                document.getElementById('meeting-id').innerHTML = ``;
                document.getElementById('info-meeting').innerHTML = this.externalMeetingId;
                document.getElementById('info-name').innerHTML = this.attendeeName;
                this.switchToFlow('flow-devices');
                await this.openAudioInputFromSelection();
                await this.openVideoInputFromSelection(document.getElementById('video-input').value, true);
                await this.openAudioOutputFromSelection();
                this.hideProgress('progress-authenticate');
            }
        );
    };


    async getAttendeeJoinDataAPI() {
        const response = await fetch(`${DemoMeetingApp.MeetingAPI}attendee-join-data?externalMeetingId=${encodeURIComponent(this.externalMeetingId)}&attendeeExternalUserId=${encodeURIComponent(this.attendeeExternalUserId)}`);
        const jsonResponse = await response.json();
        if (jsonResponse.error) {
            throw new Error(`Server error: ${jsonResponse.error}`);
        }
        return jsonResponse.data;
    }

    async authenticate() {
        let joinInfo = (await this.getAttendeeJoinDataAPI()).JoinInfo;
        await this.initializeMeetingSession(
            new MeetingSessionConfiguration(joinInfo.Meeting, joinInfo.Attendee)
        );
        const url = new URL(window.location.href);
        url.searchParams.set('m', this.externalMeetingId);
        history.replaceState({}, `${this.externalMeetingId}`, url.toString());
    }


    startConnectChat = () => {
        document.getElementById('start-video-button').style.display = 'none';
        this.attendeeName = document.getElementById('inputAttendeeName').value;
        const div = document.getElementById('connect-wrapper');
        div.style.display = 'block';
        document.getElementById('content').style.display = 'none';

        document.getElementById('inputExternalMeetingId').value = uuidv4();

        this.externalMeetingId = document.getElementById('inputExternalMeetingId').value;
        this.attendeeName = document.getElementById('inputAttendeeName').value;
        this.attendeeEmail = document.getElementById('inputAttendeeEmail').value;
        this.attendeeExternalUserId = uuidv4();

        this.referenceId = document.getElementById('inputReferenceId').value;

        this.connectProvider.startChat(this.externalMeetingId, this.attendeeName, this.attendeeExternalUserId, this.attendeeEmail, this.referenceId);

    }

    startVideoFromChat = () => {
        document.getElementById('content').style.display = 'flex';
        document.getElementById('form-authenticate').style.display = 'none';
        this.submitForm();
    }

}

class ConnectProvider {
    connectRegion = vceConfig.connectInstanceARN.split(':')[3];
    connectAPiGatewayEndpoint = `${vceConfig.chatAPI}start`;
    connectDefaultContactFlowId = vceConfig.connectDefaultContactFlowId

    mainApplication = {}

    constructor(application) {
        this.mainApplication = application;
    }


    initConnect() {
        window.connect.ChatInterface.init({
            containerId: 'connect-container',
            headerConfig: {
                isHTML: true,
                render: () => {
                    return (`
                        <div class="header-wrapper">
                            <div class="welcome-text">Chat</div>
                        </div>
                    `)
                }
            }
        });
    }

    startChat(externalMeetingId, attendeeName, attendeeExternalUserId, attendeeEmail, referenceId) {
        window.connect.ChatInterface.initiateChat({
            name: attendeeName,
            region: this.connectRegion,
            apiGatewayEndpoint: this.connectAPiGatewayEndpoint,
            contactAttributes: JSON.stringify({
                'customerName': attendeeName,
                'customerEmailAddress': attendeeEmail,
                'videoExternalMeetingId': externalMeetingId,
                'videoAttendeeExternalUserId': attendeeExternalUserId,
                'videoAttendeeName': attendeeName,
                'videoAttendeeEmail': attendeeEmail,
                'videoVendorName': 'demo-website',
                //videoRouteToAgent is only used for demo purposes, to always route to agent (agent's personal queue), while in regular production usage, videoRouteToAgent would not be used in the website
                'videoRouteToAgent': (attendeeEmail.includes('@') && attendeeEmail.includes('+') ? (`${(attendeeEmail.split('@')[0]).replace('+', '_')}@${attendeeEmail.split('@')[1]}`) : attendeeEmail),
                //videoReferenceId allows customer to be connected to a specific agent - the agent would create an ad-hoc route and provide the ReferenceId to the customer (instead of using videoRouteToAgent)
                'videoReferenceId': referenceId
            }),
            contactFlowId: this.connectDefaultContactFlowId
        }, (chatSession) => {
            chatSession.onIncoming((message => {
                this.onIncomingChatMessage(message);
            }));
            chatSession.onChatDisconnected(() => {
                this.onChatDisconnected();
            })
        }),
            (error => {
                console.error(error);
            })
    }

    onIncomingChatMessage(message) {
        if (message.Type === 'MESSAGE') {
            if (message.ParticipantRole === 'AGENT') {
                if (message.Content.startsWith('Automatic reply:')) {
                    if (message.Content.includes('agent started video session')) {
                        this.mainApplication.startVideoFromChat();
                    }
                }
            }
        }
    }

    onChatDisconnected() {
        const buttonMeetingLeave = document.getElementById('button-meeting-leave');
        buttonMeetingLeave.disabled = true;
        this.mainApplication.leave();
        buttonMeetingLeave.disabled = false;

        setTimeout(() => {
            window.location = window.location.pathname;
        }, 2000);
    }

}

window.addEventListener('load', () => {
    document.body.classList.add('background');
    new DemoMeetingApp();
});