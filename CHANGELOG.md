# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.6] - 2023-04-18
### Changed
- [agent-app] - update dependencies

## [2.3.5] - 2023-02-09
### Changed
- [agent-app] - update dependencies
- [cdk-stacks/lambdas] - update dependencies
- [demo-website] - update dependencies 


## [2.3.4] - 2023-02-01
### Changed
- [README.md] - deleting instructions for updating IAM role to allow it to assume itself and renumbering steps
- [connectAPI-stack.ts] - IAM patching to follow new role requirements (see blog post https://aws.amazon.com/blogs/security/announcing-an-update-to-iam-role-trust-policy-behavior/)


## [2.3.3] - 2023-02-01
### Changed
- [cdk-stacks] - update dependencies

## [2.3.2] - 2023-01-25
### Changed
- [cdk-stacks] - update dependencies
- [agent-app] - update dependencies
- [demo-website] - update dependencies
- [cdk-stacks] - move lambdas from NODE 12 to 14
- [README.md] - adding in instructions for updating IAM role to allow it to assume itself 

## [2.3.1] - 2022-11-23
### Changed
- [cdk-stacks] - update dependencies
- [agent-app] - update dependencies
- [demo-website] - update dependencies

## [2.3.0] - 2022-08-12
### Changed
- [agent-app] - update dependencies and minor modifications to support chime-sdk v3
- [demo-website] - update dependencies and minor modifications to support chime-sdk v3

## [2.2.1] - 2022-03-29

### Changed
- README - update configuration parameters description
- [cdk-stacks] - Configuration Script (configure.js) - SSM Parameters Put/Get/Delete batching
- [cdk-stacks] - update dependencies
- [agent-app] - update dependencies
- [demo-website] - update dependencies

## [2.2.0] - 2022-01-06

### Changed
- [agent-app] - update webpack-dev-server
- [agent-app] - update aws-amplify packages
- [demo-website] - update dependencies
- [cdk-stacks/lambdas] - update dependencies
- [cdk-stacks] - replace LambdaProxyIntegration with HttpLambdaIntegration
- [cdk-stacks] - replace CdkPipeline with CodePipeline
- [cdk-stacks] - fix ContentType in cdk-stacks/lambdas/custom-resources/frontend-config/index.py

## [2.1.2] - 2021-08-26

- [cdk-stacks] - update dependencies
- [agent-app] - update dependencies
- [demo-website] - update dependencies


## [2.1.1] - 2021-06-17

### Changed

- [cdk-stacks] - update dependencies
- [agent-app] - update dependencies
- [cdk-stacks] - update dependencies


## [2.1.0] - 2021-05-28
The version 2.1.0 brings support for Video Call Recording, as described in [Video Call Recording](/cdk-stacks/README.md#Video-Call-Recording)

### Added

- [cdk-stacks/lib/cdk-backend-stack] 
    - `RecordingStack` and `RecordingAPIStack` nested stacks added
    - `frontendConfigStack` parameters added: `deployRecordingStack`, `recordingAttendeeName`
    - `connectAPIStack` parameters added: `cognitoUserPoolId`, `cognitoUserPoolARN`, `appTable`
- [cdk-stacks/lib/recording/recording-stack.js] - new stack for Video Call Recording. Resources: `recordingVPC`, `recordingECSSecurityGroup`, `recordingECSCluster`, `recordingECSAutoScalingGroup`, `recordingECSCapacityProvider`, `recordingTaskDefinition`, `recordingTaskLogGroup`, `recordingDockerImage`, `recordingBucket`, `autoscalingEC2InstanceLaunchRule`, `startRecordingPreWarmTaskLambda`
- [cdk-stacks/lib/api/recordingAPI-stacks.ts] - new stack for Video Call Recording. Resources:  `startRecordingLambda`, `stopRecordingLambda`, `getRecordingSummaryLambda`, `recordingAPI`, `startRecording_Route`, `stopRecording_Route`, `getRecordingSummary_Route`
- [cdk-stacks/config.params.json] - `deployRecordingStack`, `recordingPlaybackSecurityProfileId`, `recordingAttendeeName`, `recordingPresignedURLExpiresMinutes`, `CdkChimeEventBridgeStack`
- [cdk-stacks/lib/api/connectAPI-stacks.js] - resources added:
    - AWS Lambda functions: `putConnectUserCacheLambda`, `setConnectUserIdLambda`, 
    - Amazon API Gateway HTTP API Routes: `setConnectUserId_Route`, `putConnectUserCache_Route`
- [cdk-stacks/bin/cdk-stacks.js] - add `CdkChimeEventBridgeStack` and `isDeployRecordingStack` method
- [cdk-stacks/lib/pipeline/cdk-pipeline-stacks.js]
    - add `ec2:DescribeAvailabilityZones` to Pipeline `rolePolicyStatements`
    - add `deployRecordingStack: ssmParams.deployRecordingStack`
- [cdk-stacks/lib/pipeline/cdk-pipeline-stage.ts] - add `cdkChimeEventBridgeStack`
- [cdk-stacks/docker/recording] - folder contains all the assets required for Amazon ECS Recording Task:
    - [Dockerfile] - specifies the Docker image for Recording Task, pulled: `FROM public.ecr.aws/lts/ubuntu:18.04_stable`, and describes all the steps (install dependencies and copy operations) during the image build.
    - [recording-app] - folder contains a web based application, with Amazon Chime SDK for JavaScript, and minimal set of UI elements to display all Amazon Chime SDK meeting participants.
    - [recording-task] - folder contains `run.sh` and `record.js` scripts, which are started when a new Recording Task starts
- [cdk-stacks/lambdas/handlers/RecordingAPI] - folder contains AWS Lambda handlers for Recording API
    - [startRecording.js] - handler for `StartRecordingLambda`
    - [stopRecording.js] - handler for `StopRecordingLambda`
    - [getRecordingSummary.js] - handler for `GetRecordingSummaryLambda`
    - [stopRecordingEventTarget.js] - handler for `stopRecordingEventTargetLambda`
    - [startRecordingPreWarmTask.js] - handler for `startRecordingPreWarmTaskLambda`
- [cdk-stacks/lambdas/handlers/ConnectAPI] - folder contains AWS Lambda handlers for Connect API, new resources added:
    - [setConnectUserId.js] - handler for `setConnectUserIdLambda`
    - [putConnectUserCache.js] - handler for `putConnectUserCacheLambda`
- [cdk-stacks/lambdas/repository/RecordingRepo.js] - new functions: `putRecording`, `getRecordingsByExternalMeetingId`, `setRecordingEndedAt`
- [cdk-stacks/lambdas/repository/AttendeeRepo.js] - new functions: `getAttendeeByExternalUserId`
- [cdk-stacks/lambdas/repository/ConnectUserCacheRepo.js] - new functions: `putConnectUserCache`, `getConnectUserCache`
- [cdk-stacks/lambdas/repository/Constants.js] - new Entities: `Recording` and `ConnectUserCache`
- [cdk-stacks/lambdas/services/AttendeeService.js] - new functions: `deleteAttendee`
- [cdk-stacks/lambdas/services/RecordingService.js] - new functions: `generateRecordingFilename`, `startRecording`, `startECSRecordingTask`, `getRecordingsInProgress`, `isFirstRecording`, `stopECSRecordingTask`, `stopRecording`, `stopRecordingEventTarget`, `getRecordingSummary`, `setVideoRecordingPlaybackURLContactAttribute`, `generateRecordingSummaryWithPreSignedURL`, `isInHierarchy`, `getContainerInstanceId`, `startRecordingPreWarmTask`
- [cdk-stacks/lambdas/services/CognitoService.js] - new functions: `updateUserAttributes`
- [cdk-stacks/lambdas/services/ConnectService.js] - new functions: `describeUser`, `describeUserHierarchyGroup`, `setConnectUserId`, `getConnectUserCache`, `putConnectUserCache`, `getUserHierarchyGroup`, `updateContactAttributes`
- [cdk-stacks/lambdas/services/S3Service.js] - new functions: `generatePreSignedURL`
- [cdk-stacks/lambdas/lib/AuthUtility.js] - returns additional attribute: `connectUserId: claim['custom:connectUserId']`
- [cdk-stacks/lambdas/lib/CommonUtility.js] - new functions: `makeComparator`, `convertHierarchyLevelId`, `wait`

- [agent-app/src/index.js]
    - `recordingAPI` endpoint configuration added to `amplifyAPIConfig`
    - `amplifyAuthConfig` - `profile` added to `scope`, and `responseType` changed to `code` - to support Amazon Cognito User Pool custom attributes in Id token (JWT)
    - `InitProvider` added to support User Onboarding, as described in [User Onboarding in agent-app](/cdk-stacks/README.md#User-Onboarding-in-agent-app)
- [agent-app/src/apis/recordingAPI.js] - new functions: `startRecording`, `stopRecording`, `getRecordingSummary`
- [agent-app/src/apis/ConnectAPI.js] - new functions: `setConnectUserId`, `putConnectUserCache`
- [agent-app/src/constants] - new constants:
    - `RecordingStatus`: `NOT_STARTED`, `STARTED`, `STOPPED`, `STARTING`, `STOPPING`, `STARTING_FAILED`, `STOPPING_FAILED`, `STOPPING_UNKNOWN`, `REQUEST_REJECTED`
    - `ConnectContactAttributes`: `videoExternalMeetingId`, `videoAttendeeExternalUserId`, `videoAttendeeName`, `videoAttendeeEmail`, `videoRecordingAutoStartEnabled`, `videoRecordingStartStopEnabled`, `videoRecordingPlaybackURL`
- [agent-app/src/hooks/useNotificationHelper] - new functions: `notificationInformation`, `notificationError`, `notificationReject`, `displayNotification`
- [agent-app/src/utils/NotificationUtility.js] - new functions: `infoMessage`, `errorMessage`, `rejectMessage`
- [agent-app/src/providers/AppConfigProvider.js] - new config parameters: `deployRecordingStack`, `recordingAttendeeName`
- [agent-app/src/constants/routes.js] - new route added: `RECORDING: '/recording'` to display `RecordingView`
- [agent-app/src/views/Onboarding/index.js] - new view to support User Onboarding - hosting `<CCP isOnboarding={true} />`
- [agent-app/src/providers/InitProvider.js] - new provider to support user Onboarding, with new functions: `initConnectUser`, `refreshCurrentSession`, `setConnectUserId`
- [agent-app/src/container/CCP/index.js]
    - `isOnboarding` prop added
    - `initConnectUser` function from `InitProvider` added
    - `onConnectInitialized` function added
- [agent-app/src/App.js]
    - `Onboarding` view added, 
    - `RecordingView` added, hosting `RecordingPlayback` container and `RecordingPlaybackProvider`
    - `InitProvider` added (to `setConnectUserId`)
    - `postLoginRedirectURL` added, to support redirect to `/recording` after federated login
    - new functions: `setPostLoginRedirectURL`, `getPostLoginRedirectURL`
- [agent-app/src/providers/AmazonConnectProvider.js] - new function: `recordingManagerFeatures` providing `videoRecordingAutoStartEnabled`, `videoRecordingStartStopEnabled` feature parameters
- [agent-app/src/providers/RecordingProvider/index.js] - new provider that enables Video Call Recording:
    - Provides `RecordingManager` which helps Video Call Recording integration 
    - Monitors meeting roster, when Video Call Recording is deployed and enabled (`recordingManager.shouldMonitorMeetingRoster()`)
    - Triggers `RecordingManager` status update when `RECORDING` attendee joins, or leaves the meeting (`recordingManager.setRecordingAttendeePresent()`)
    - Subscribes to Recording Status: `recordingManager.subscribeToRecordingStatus`
    - Triggers notifications: `onRecordingManagerStatusUpdate` -> `displayNotification`
- [agent-app/src/providers/RecordingProvider/RecordingManager.js] - Tied to RecordingProvider, responsible for starting and stopping Video Call Recording, and providing Call Recording Status updates to observers.
    - Properties: `externalMeetingId`, `connectContactId`, `recordingStatus`, `attendeePresent`, `deployRecordingStackConfig`, `recordingAttendeeNameConfig`, `videoRecordingStartStopEnabled`, `videoRecordingAutoStartEnabled`, `recordingStatusObservers`
    - Methods: `toggleRecordingEnabled`, `shouldMonitorMeetingRoster`, `shouldAutoStartRecording`, `initRecordingStatus`, `setRecordingFeatures`, `canStartRecording`, `canStopRecording`, `startRecording`, `stopRecording`, `toggleRecording`, `setRecordingAttendeePresent`, `recordingAttendeeJoined`, `onMeetingRecordingStarted`, `recordingAttendeeLeft`, `onMeetingRecordingStopped`, `meetingEnded`, `getMessageByRecordingStatus`, `publishAndReturn`, `subscribeToRecordingStatus`, `unsubscribeFromRecordingStatus`, `publishRecordingStatus`
- [agent-app/src/views/VideoAgent] - `RecordingProvider` added to `VideoAgent` view
- [agent-app/src/containers/MeetingForm/index.js] - `recordingManager` added to support Video Call Recording (`initRecordingStatus`, `setRecordingFeatures`, `shouldAutoStartRecording`, `startRecording`)
- [agent-app/src/components/ToggleRecordingButton/index.js] - Toggle Recording button, allowing agents to Start and Stop recording
- [agent-app/src/containers/MeetingControls/index.js] - new button added to Meeting Controls: `ToggleRecordingButton`
- [agent-app/src/containers/RecordingPlayback] - UI container to host `RecordingPlaylist` and `RecordingPlayer` components 
- [agent-app/src/components/RecordingPlaylist] - UI Video Playlist component, to display a list of all available call recordings based on `chimeExternalMeetingId`
- [agent-app/src/components/RecordingPlayer] - UI Video Player component, to playback video call recordings
- [agent-app/src/providers/RecordingPlaybackProvider] - Recording Playback Provider for `RecordingPlaylist` and `RecordingPlayer` components

### Changed
 - [cdk-stacks/lib/cdk-frontend-stack.js] - added `errorConfigurations` to support `/recording` route in React Router 
 - [cdl-stacks/lib/infrastructure/cognito-stack.js]
    - `customAttributes: connectUserId` added to Amazon Cognito User Pool
    - `scopes` - `cognito.OAuthScope.PROFILE` added to enable Amazon Cognito User Pool custom attributes presence in Id token (JWT)
 - [agent-app/src/hooks/useEndMeetingControl.js] - `recordingManager` added to Stop Call Recording, at the end of the session (`leaveMeeting -> recordingManager.meetingEnded()`, `endMeetingForAll -> recordingManager.meetingEnded()`)
 - [agent-app/webpack.config.dev.js] - `historyApiFallback: true` to support `/recording` route in React Router 
 - [diagrams] - updated Solution Architecture, Authentication and AuthenticationSSO, to include Onboarding process
 - [ConnectContactFlow] - `Set contact attributes` block added, with both `videoRecordingStartStopEnabled` and `videoRecordingAutoStartEnabled` custom Contact Attributes


## [2.0.0] - 2021-04-28
The version 2.0.0 brings a support for CDK Pipelines, as described in [Deploying with AWS CDK Pipelines](/cdk-stacks/README.md#Deploying-with-AWS-CDK-Pipelines), and introduces significant updates in CDK Stacks, Lambdas and DynamoDB, therefore not backward compatible with 1.x.x version. In case you already had v1.x.x deployed, it is necessary to deploy v2.0.0 as a new stack.

### Added
 - [cdk-stacks] - folder containing all backend and frontend resources:
    - [cdk-stacks/bin/cdk-stacks.ts] - CDK application, supports:
        - [`Stack mode`] - deploys `CdkBackendStack` and `CdkFrontendStack`
        - [`Pipeline mode`] - deploys `CdkPipelineStack`, with `CdkPipelineStage`, where `CdkPipelineStage` deploys `CdkBackendStack` and `CdkFrontendStack`
    - [cdk-stacks/lib/cdk-backend-stack] - AWS CDK stack, defines backend resources:
        - [infrastructure/CognitoStack] - `UserPool`, `UserPoolClient`, `UserPoolDomain`, `IdentityPool`, `CognitoDefaultUnauthenticatedRole`, `CognitoDefaultAuthenticatedRole`
        - [infrastructure/DynamoDBStack] - single DynamoDB table - `VideoCallEscalationDB`, for all the entities
        - [infrastructure/ssm-param-util] - utility functions for AWS SSM configuration parameters
        - [api/chatAPI] - `StartChatLambda`, `Chat API Gateway`
        - [api/chimeAPI] - `CreateMeetingLambda`, `EndMeetingForAllLambda`, `GetAttendeeJoinDataLambda`, `GetAttendeeNameLambda`, `CreateAttendeeLambda`, `Chime API Gateway`
        - [api/connectAPI] - `CCPLoginLambda`, `Connect API Gateway`
        - [api/meetingAPI] - `Meeting API Gateway`
        - [api/routingAPI] - `CreateAdHocRouteLambda`, `Routing API Gateway`
        - [WebAppBucket] - Amazon S3 bucket to host web applications
        - [FrontendConfigStack] - `FrontendConfigLambda`, `FrontendConfigCustomResource` - gets Stack outputs, generates `frontend-config.js` file, and uploads it to `WebAppBucket`
    - [cdk-stacks/lib/cdk-frontend-stack] - AWS CDK stack, defines frontend resources:
        - [FrontendS3DeploymentStack] - deploys `agent-app` and `demo-website` to `WebAppBucket`
        - [WebAppCloudFrontDistribution] - deploys CloudFront Web Distribution for `WebAppBucket`
    - [cdk-stacks/lib/pipeline] - AWS CDK stack for CDK Pipelines:
        - [CdkPipelineStack] - `AWS CodeCommit Repository`, `AWS CodeCommit Repository User`, `AWS CDK Pipeline`
        - [CDKPipelineStage] - deploys `CDKBackendStack` and `CDKFrontEndStack`
 - [cdk-stacks/lambdas/handlers] - folder containing all AWS Lambda function handlers:
    - [ChatAPI] - AWS Lambda handler for `StartChatLambda`
    - [ChimeAPI] - AWS Lambda handlers for: `CreateAttendeeLambda`, `CreateMeetingLambda`, `EndMeetingForAllLambda`, `GetAttendeeJoinDataLambda`, `GetAttendeeNameLambda`
    - [ConnectAPI] - AWS Lambda handler for `CCPLoginLambda`
    - [RoutingAPI] - AWS Lambda handler for `CreateAdHocRouteLambda`
- [cdk-stacks/lambdas/services] - folder containing all services, consumed by AWS Lambda handlers:
    - [AttendeeService] - `getAttendeeName`, `createAttendee`, `getAttendeeJoinData`
    - [ChatService] - `startChat`
    - [ConnectService] - `ccpLogin`
    - [MeetingService] - `createMeeting`, `endMeetingForAll`
    - [RoutingService] - `createAdHocRoute`, `getRouteToAgent`
- [cdk-stacks/lambdas/repository] - folder containing DynamoDB operations:
    - [AttendeeRepo] - `getAttendeeName`, `getAttendeeJoinData`, `putAttendee`
    - [MeetingRepo] - `getMeetingByExternalMeetingId`, `putMeeting`, `setMeetingEndedAt`
    - [RoutingRepo] - `putRoute`, `getRouteById`, `setRouteUsedAt`
    - [Constants] - definition of Entities and their attributes: `Meeting`, `Attendee`, `Route`
- [cdk-stacks/lambda/lib] - folder containing Utility functions, previously in `utility-layer`:
    - [AuthUtility] - `getCurrentUser` verifies claims from JWT and returns `username` and `email`
    - [CommonUtility] - `uuid`, `validateEmailAddress`
    - [HashUtility] - `createNumericHash`
    - [LambdaUtility] - `buildLambdaResponse`, `parseEventBody`
- [cdk-stacks/lambdas/custom-resources/frontend-config] - AWS Lambda function that creates `frontend-config` as a Custom Resource in CDK stack, and uploads it to `WebAppBucket`
- [cdk-stacks/config.params] - new parameters added to support CDK Pipeline deploy mode: `cdkPipelineEnabled`, `cdkPipelineRepositoryName`, `cdkPipelineRepositoryBranchName`, `cdkPipelineCreateNewRepository`, `cdkPipelineStageName`
- [cdk-stacks/config.params] - new parameters added to unify CDK resource names: `CdkAppName`, `CdkBackendStack`, `CdkFrontendStack`, `CdkPipelineStack`, `WebAppRootPrefix`, `WebAppStagingPrefix`

 ### Changed
 - [config.params] - `connectAPILambdaRoleToAssume` renamed to `ccpLoginLambdaRoleToAssume`
 - [cdk version] - CDK upgraded to v1.98.0
 - [cdk.json] - `"@aws-cdk/core:newStyleStackSynthesis": true` to use new-style bootstrapping
 - [Cognito User Pool] - set removalPolicy to `destroy`
 - [agent-app] - changes to support `frontend-config.js` (previously `aws-exports.json`). A change of config (SSM param) does not require `build` anymore
 - [agent-app] - set local webpack port to `3000`
 - [agent-app] - unified variable/reference names: `externalMeetingId`, `meetingRegion`, `attendeeName`, `attendeeEmail`, `attendeeExternalUserId`
 - [demo-website] - changes to support `frontend-config.js` (previously `aws-exports.json`). A change of config (SSM param) does not require `build` anymore
 - [demo-website] - set local webpack port to `3001`
 - [demo-website] - unified variable/reference names: `externalMeetingId`, `meetingRegion`, `attendeeName`, `attendeeEmail`, `attendeeExternalUserId`
 - [cdk-stacks/package.json] - new scripts introduced to support:
    - [install] - `install:agent-app`, `install:demo-website`, `install:cdk-stacks`, `install:lambdas`, `install:all`
    - [echo CDK outputs] - `echo:web-app-root-prefix`, `echo:cdk-frontend-stack-name-param`, `echo:cdk-frontend-stack-physical-name`, `echo:web-app-bucket`
    - [sync config] - Downloads `frontend-config.js` from `WebAppBucket` to support local frontend testing: `sync-config`, `sync-config:agent-app`, `sync-config:demo-website`
    - [build] - `build:agent-app`, `build:demo-website`, `build:frontend`
    - [cdk deploy] - `cdk:remove:context`, `cdk:deploy`
    - [single command build and deploy] - `build:frontend:cdk:deploy`
- [diagrams] - Solution Diagram and Sequence Diagrams updated to reflect all the changes in release v2.0.0


 ### Removed
  - [cdk-backend] - folder removed, all resources migrated to `cdk-stacks` folder
  - [cdk-frontend] - folder removed, all resources migrated to `cdk-stacks` folder
  - [chatapi-lambda] - folder removed, APIs migrated to `cdk-stacks/lambdas/handlers/ChatAPI` folder
  - [chimeapi-lambda] - folder removed, APIs migrated to `cdk-stacks/lambdas/handlers/ChimeAPI` folder
  - [connectapi-lambda] - folder removed, APIs migrated to `cdk-stacks/lambdas/handlers/ConnectAPI` folder
  - [routingapi-lambda] - folder removed, APIs migrated to `cdk-stacks/lambdas/handlers/RoutingAPI` folder
  - [utility-layer] - folder removed, Utility functions migrated to `cdk-stacks/lambdas/lib` folder
  - [install.sh] - script deprecated, use `npm run install:all` in `cdk-stacks` folder
  - [deploy.sh] - scripts deprecated, use `npm run cdk:deploy` in `cdk-stacks` folder
  - [MeetingsTable] - DynamoDB table deprecated, all entities stored in a single-table `VideoCallEscalationDB`
  - [AttendeesTable] - DynamoDB table deprecated, all entities stored in a single-table `VideoCallEscalationDB`
  - [RoutesTable] - DynamoDB table deprecated, all entities stored in a single-table `VideoCallEscalationDB`

## [1.1.4] - 2021-04-28
### Changed
 - [demo-website] - Upgrade `amazon-connect-chat-interface.js`, to support `ca-central-1` region

## [1.1.3] - 2021-03-25 
### Changed
 - [demo-website] - Upgrade webpack to v5

## [1.1.2] - 2021-03-24
### Changed
 - [agent-app] - Upgrade webpack to v5
 
## [1.1.1] - 2021-03-23
### Changed
 - [chimeapi-lambda] - replaced `Chime.createMeeting` with `Chime.createMeetingWithAttendees`
 
## [1.1.0] - 2021-03-16
### Added
 - [agent-app] - eslint and eslint-plugin-react packages added
 - [agent-app] - videoCallEscalationRoutingAPI added to Amplify config
 - [agent-app] - AppStateProvider - add connectUsername
 - [agent-app] - AppConfigProvider - websiteAdHocRouteBaseURL added
 - [agent-app] - support for ad-hoc routes added
 - [demo-website] - eslint, eslint-parser, plugin-proposal-class-properties packages added
 - [demo-website] - ad-hoc route support implemented
 - [cdk-backend] - routingapi-lambda added
 - [cdk-backend] - config.params.json - websiteAdHocRouteBaseURL parameter added
### Changed
 - [agent-app] - amazon-chime-sdk-component-library-react package version upgrade (1.6.1)
 - [agent-app] - AmazonConnectProvider fix - check of contact attributes exist
 - [agent-app] - support for new Amazon Connect domain ()
 - [demo-website] - css update - header-title-authenticate
 - [cdk-backend] - deploy.sh exit when build fails
 - [cdk-frontend] - deploy.sh exit when build fails
 - [ContactFlows] - support for ad-hoc routes added

## [1.0.2] - 2021-02-24
### Added
- [utility-layer] - eslint and esbuild packages added
- [utility-layer] - npm build script added (using esbuild)
- [connectapi-lambda] - esbuild package added
- [connectapi-lambda] - npm build script added (using esbuild)
- [chimeapi-lambda] - esbuild package added
- [chimeapi-lambda] - npm build script added (using esbuild)
- [chatapi-lambda] - esbuild package added
- [chatapi-lambda] - npm build script added (using esbuild)
- [cdk-backend] - deploy.sh script - `npm run build` added for Lambdas and Layer, before `cdk deploy` command
- [cdk-backend] - .gitignore - `build` folder added

### Changed
 - [cdk-frontend] - bumped version to 1.0.0
 - [cdk-backend] - bumped version to 1.0.0
 - [cdk-backend] - Lambdas and Layer `code` source changed to `/build` folder
 - [utility-layer] - folders restructured, following the standard Lambda structure
 - [connectapi-lambda] - Layer import path updated
 - [chimeapi-lambda] - Layer import path updated
 - [README.md] - `cdk boostrap` command to be run in the root directory

### Removed
 - [install.sh] - removed `elif` branch, used to install lambda-layer packages. Layers and Lambdas have the same folder structure now

## [1.0.1] - 2021-02-19
### Added
 - [agent-app] webpack and babel packages
 - [agent-app] aws-amplify/api-rest package
 - [agent-app] webpack config files
 - [demo-website] babel/runtime and babel/plugin-transform-runtime packages
### Changed
 - [agent-app] aws-amplify/auth, aws-amplify/ui-react packages
 - [agent-app] start and build npm scripts
 - [agent-app] chimeAPI.js and connectAPI.js now use aws-amplify/api-rest
 - [demo-website] popper.js, webpack, *-loader packages
### Removed
 - [agent-app] react-scripts, aws-amplify/core, aws-amplify/api, jest packages
 - [agent-app] robots.txt and favicon.ico
 - [demo-website] babel-polyfill, remove-files-webpack-plugin, html-webpack-inline-source-plugin packages
 - [demo-website] start:dev npm script



### Fixed
## [1.0.0] - 2021-02-16
### Added
- Initial import