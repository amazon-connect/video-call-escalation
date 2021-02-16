// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';


export default function useToggle(initialState) {
  const [isActive, setIsActive] = useState(initialState);

  function toggle() {
    setIsActive(!isActive);
  }

  return {
    isActive,
    toggle,
  };
}