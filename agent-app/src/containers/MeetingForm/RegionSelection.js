// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect } from 'react';
import { Select, FormField } from 'amazon-chime-sdk-component-library-react';

import { AVAILABLE_AWS_REGIONS } from '../../constants';
import getFormattedOptionsForSelect from '../../utils/select-options-format';

const regionalOptions = [
  { value: '', label: 'Select a region' },
  ...getFormattedOptionsForSelect(AVAILABLE_AWS_REGIONS)
];

const RegionSelection = ({ setRegion, region }) => {
  useEffect(() => {
    let mounted = true;

    async function getNearestRegion() {
      if (region) {
        return;
      }

      try {
        const res = await fetch(`https://nearest-media-region.l.chime.aws`, {
          method: 'GET'
        });

        if (!res.ok) {
          throw new Error('Server error');
        }

        const data = await res.json();
        const nearestRegion = data.region;

        if (mounted) {
          setRegion((region) => region || nearestRegion);
        }
      } catch (e) {
        console.error('[VideoCallEscalation] Could not fetch nearest region: ', e.message);
      }
    }

    getNearestRegion();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormField
      field={Select}
      options={regionalOptions}
      onChange={(e) => {
        setRegion(e.target.value);
      }}
      value={region}
      label="Meeting region"
    />
  );
};

export default RegionSelection;