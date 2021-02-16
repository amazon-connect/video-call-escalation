
  // Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
  
  export default function getFormattedOptionsForSelect(
    jsonObject
  ) {
    const formattedJSONObject = Object.entries(jsonObject).map(entry => ({
      value: entry[0],
      label: entry[1],
    }));
    return formattedJSONObject;
  }