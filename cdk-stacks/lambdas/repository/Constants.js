// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export const ENTITIES = {
    Meeting: {
        entityPrefix: 'M#',
        entityType: 'Meeting',
        attributes: {
            meetingTitle: 'meetingTitle',
            ownerUsername: 'ownerUsername',
            ownerName: 'ownerName',
            ownerEmail: 'ownerEmail',
            createdAt: 'createdAt',
            endedAt: 'endedAt',
            externalMeetingId: 'meetingId',
            chimeMeetingId: 'chimeMeetingId',
            chimeMeetingData: 'chimeMeetingData',
            TTL: 'TTL'
        }
    },
    Attendee: {
        entityPrefix: 'A#',
        entityType: 'Attendee',
        attributes: {
            attendeeName: 'attendeeName',
            attendeeEmail: 'attendeeEmail',
            createdAt: 'createdAt',
            externalUserId: 'externalUserId',
            chimeAttendeeId: 'chimeAttendeeId',
            chimeAttendeeData: 'chimeAttendeeData',
            isOwner: 'isOwner',
            TTL: 'TTL'
        }
    },
    Route: {
        entityPrefix: 'R#',
        entityType: 'Route',
        attributes: {
            routeId: 'routeId',
            routeHash: 'routeHash',
            ownerUsername: 'ownerUsername',
            createdAt: 'createdAt',
            usedAt: 'usedAt',
            routeToAgentQueue: 'routeToAgentQueue',
            attendeeEmail: 'attendeeEmail',
            TTL: 'TTL'
        }
    }
}