// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import styled from 'styled-components';

export const StyledButtonGroup = styled.footer`
  padding: 1.5rem;
  border-top: 1px solid ${props => props.theme.modal.border};
  display: flex;
  flex-direction: row-reverse;
  justify-content: space-between;
  div:first-child {
    display: flex;
    flex-direction: row-reverse;
  }
  button + button {
    margin: 0 0.5rem 0 0.5rem;
  }
  @media (max-width: 35rem) {
    flex-direction: column;
    button {
      width: 100%;
    }
    div:first-child {
      display: flex;
      flex-direction: column;
    }
    button + button,
    div + div {
      margin: 0.5rem 0 0;
    }
  }
`;