// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import styled from 'styled-components';


export const StyledControls = styled.div`
  opacity: ${props => (props.active ? '1' : '0')};
  transition: opacity 250ms ease;
  @media screen and (max-width: 768px) {
    opacity: 1;
  }
  .controls-menu {
    width: 100%;
    position: static;
  }
`;