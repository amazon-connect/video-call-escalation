// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { FormField, Input, Modal, ModalBody, ModalHeader, SecondaryButton, PrimaryButton, Heading } from 'amazon-chime-sdk-component-library-react';
import React, { useState } from 'react';
import { createAdHocRoute } from '../../apis/routingAPI';
import { StyledP, StyledRouteLabel, StyledRouteLink, StyledErrorMessage } from './Styled';
import { useAppState } from '../../providers/AppStateProvider';
import {useAppConfig} from '../../providers/AppConfigProvider'
import {DemoWebsitePage} from '../../constants'

const AdHocRouteModal = () => {

    const [showModal, setShowModal] = useState(false)
    const [attendeeEmail, setAttendeeEmail] = useState('')
    const [attendeeEmailErr, setAttendeeEmailErr] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [routeId, setRouteId] = useState('')
    const [routeIdErr, setRouteIdErr] = useState(false)

    const {
        connectUsername: appConnectUsername
      } = useAppState();

    const { websiteAdHocRouteBaseURL } = useAppConfig()

    const getWebsiteAdHocRefLink = () =>{
        const baseURL = websiteAdHocRouteBaseURL? websiteAdHocRouteBaseURL : `${window.location.protocol}//${window.location.host}/${DemoWebsitePage}`
        return `${baseURL}?refId=${routeId}&refEm=${attendeeEmail}`
    }

    const toggleModal = () => {
        setShowModal(!showModal)
        if(!showModal) resetModal()
    }

    const resetModal = () => {
        setAttendeeEmail('')
        setAttendeeEmailErr(false)
        setRouteId('')
        setRouteIdErr(false)
    }

    const handleAdHocRoute = async (e) => {
        e.preventDefault()

        const email = attendeeEmail.trim()
        const emailRegEx = /^[^\s@]+@[^\s@]+$/
        if(!emailRegEx.test(email)){
            setAttendeeEmailErr(true)
            return
        }

        setRouteIdErr(false)
        setIsLoading(true)

        try {
            const routeId = await createAdHocRoute(email, appConnectUsername)
            setRouteId(routeId)
        }
        catch (error) {
            console.error(`[VideoCallEscalation] ${error.message}`);
            setRouteIdErr(true)
        }

        setIsLoading(false)
    }

    const copyToClipboard = (value) => {
        navigator.clipboard.writeText(value)
    }

    const getMailToLink = () => {
        const mailTo = `mailto:${attendeeEmail}`
        const subject = `Video Call Escalation - Invitation link`
        const body = `Dear Customer, to start a video session with your agent, please click on this link:`
        const link = getWebsiteAdHocRefLink()
        return `${mailTo}?subject=${subject}&body=${body} ${encodeURIComponent(link)}`
    }

    return (
        <>
            <SecondaryButton key="adhocModalBtn" type="button" onClick={toggleModal} label="Create Ad-Hoc" />
            {
                showModal && (
                    <Modal size="lg" onClose={toggleModal} rootId="modal-root">
                        <ModalHeader title="Create Ad-Hoc Route" />

                        <ModalBody>
                            {routeId ? (
                                <>
                                    <StyledP>Ad-Hoc route created for <a title={`Send via email`} href={getMailToLink(attendeeEmail)}>{attendeeEmail}</a>, please share this reference with the customer:</StyledP>
                                    <StyledRouteLabel>
                                        <Heading tag="h2" level={4} css="margin-bottom: 1rem">{routeId}</Heading>
                                    </StyledRouteLabel>
                                    <StyledP>
                                        Click on the following link to copy and share it with the customer:
                                        <StyledRouteLink>
                                            <a title={`Copy the link`} href="#" onClick={(e)=>{e.preventDefault(); copyToClipboard(getWebsiteAdHocRefLink())}}>{getWebsiteAdHocRefLink()}</a>
                                        </StyledRouteLink>
                                    </StyledP>
                                </>
                            ) : (
                                    <form>
                                        <StyledP>Create an Ad-Hoc route to enable an escalation to video and/or screen-share session. Once created, please share the reference with the customer.</StyledP>
                                        <FormField
                                            field={Input}
                                            label='Attendee Email Address'
                                            value={attendeeEmail}
                                            fieldProps={{
                                                name: 'attendeeEmail',
                                                placeholder: `Enter attendee's email address`
                                            }}
                                            errorText="Please enter a valid email address"
                                            error={attendeeEmailErr}
                                            onChange={(e => {
                                                setAttendeeEmail(e.target.value);
                                                attendeeEmailErr && setAttendeeEmailErr(false)
                                            })}
                                        />
                                        <div style={{ margin: '0 0 1rem', textAlign: 'center' }}>
                                            {isLoading ? (
                                                <span>Creating</span>
                                            ) : (
                                                    <PrimaryButton key="createAdHocBtn" label="Create" onClick={handleAdHocRoute} />
                                                )}
                                        </div>
                                        {routeIdErr && <StyledErrorMessage>
                                            An error occurred while creating route, please try again
                                        </StyledErrorMessage>

                                        }
                                    </form>
                                )}
                        </ModalBody>
                    </Modal>

                )
            }
            </>
    )


}

export default AdHocRouteModal;