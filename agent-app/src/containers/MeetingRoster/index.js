// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import {
  Roster,
  RosterHeader,
  RosterGroup,
  useRosterState,
  RosterAttendee
} from 'amazon-chime-sdk-component-library-react';

import { useNavigation } from '../../providers/NavigationProvider';

const MeetingRoster = () => {
  const { roster } = useRosterState();
  const [filter, setFilter] = useState('');
  const { closeRoster } = useNavigation();

  let attendees = Object.values(roster);

  if (filter) {
    attendees = attendees.filter((attendee) =>
      attendee?.name.toLowerCase().includes(filter.trim().toLowerCase())
    );
  }

  const handleSearch = (e) => {
    setFilter(e.target.value);
  };

  const attendeeItems = attendees.map((attendee) => {
    const { chimeAttendeeId } = attendee || {};
    return (
      <RosterAttendee key={chimeAttendeeId} attendeeId={chimeAttendeeId} />
    );
  });

  return (
    <Roster className="roster">
      <RosterHeader
        searchValue={filter}
        onSearch={handleSearch}
        onClose={closeRoster}
        title="Present"
        badge={attendees.length}
      />
      <RosterGroup>{attendeeItems}</RosterGroup>
    </Roster>
  );
};

export default MeetingRoster;