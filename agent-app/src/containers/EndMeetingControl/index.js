// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import {
  ControlBarButton,
  Phone,
  Modal,
  ModalBody,
  ModalHeader,
  ModalButton,
  ModalButtonGroup
} from 'amazon-chime-sdk-component-library-react';
import useEndMeetingControl from '../../hooks/useEndMeetingControl';
import { StyledP } from './Styled';


const EndMeetingControl = () => {
  const [showModal, setShowModal] = useState(false);
  const toggleModal = () => setShowModal(!showModal);

  const { leaveMeeting, endMeetingForAll} = useEndMeetingControl();

  return (
    <>
      <ControlBarButton icon={<Phone />} onClick={toggleModal} label="Leave" />
      {showModal && (
        <Modal size="md" onClose={toggleModal} rootId="modal-root">
          <ModalHeader title="End Meeting" />
          <ModalBody>
            <StyledP>
              Leave meeting or you can end the meeting for all. The meeting
              cannot be used once it ends.
            </StyledP>
          </ModalBody>
          <ModalButtonGroup
            primaryButtons={[
              <ModalButton
                onClick={endMeetingForAll}
                variant="primary"
                label="End meeting for all"
                closesModal
              />,
              <ModalButton
                onClick={leaveMeeting}
                variant="primary"
                label="Leave Meeting"
                closesModal
              />,
              <ModalButton variant="secondary" label="Cancel" closesModal />
            ]}
          />
        </Modal>
      )}
    </>
  );
};

export default EndMeetingControl;