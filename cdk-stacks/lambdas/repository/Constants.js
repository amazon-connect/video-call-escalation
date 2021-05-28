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
    },
    Recording: {
        entityPrefix: 'REC#',
        entityType: 'Recording',
        attributes: {
            recordingId: 'recordingId',
            ownerUsername: 'ownerUsername',
            ownerEmail: 'ownerEmail',
            connectUserId: 'connectUserId',
            connectHierarchyGroupId: 'connectHierarchyGroupId',
            connectHierarchyGroupSummary: 'connectHierarchyGroupSummary',
            createdAt: 'createdAt',
            endedAt: 'endedAt',
            recordingS3Bucket: 'recordingS3Bucket',
            recordingS3Object: 'recordingS3Object',
            ecsTaskARN: 'ecsTaskARN',
            TTL: 'TTL'
        }
    },
    ConnectUserCache: {
        entityPrefix: 'CUC#',
        entityType: 'ConnectUserCache',
        attributes: {
            connectUserId: 'connectUserId',
            hierarchyGroupId: 'hierarchyGroupId',
            hierarchyGroupSummary: 'hierarchyGroupSummary',
            securityProfileIds: 'securityProfileIds',
            createdAt: 'createdAt',
            TTL: 'TTL'
        }
    }
}