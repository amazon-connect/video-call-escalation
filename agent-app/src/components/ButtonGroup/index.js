// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { StyledButtonGroup } from './Styled';

const ButtonGroup = ({
  primaryButtons,
  secondaryButtons,
}) => {
  return (
    <StyledButtonGroup data-testid="button-group">
      <div>{primaryButtons}</div>
      {secondaryButtons && (
        <div>{secondaryButtons}</div>
      )}
    </StyledButtonGroup>
  );
};

export default ButtonGroup;