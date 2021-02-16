// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import styled from 'styled-components';

export const StyledLayout = styled.main`
  display: block;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80%;
  max-height: 90%;
  max-width: 85rem;
  width: 90%
  margin-left : 10%
  margin: auto;
  @media (max-width: 760px) {
    border-right: unset;
    align-items: unset;
    justify-content: unset;
  }
`;