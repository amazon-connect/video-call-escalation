# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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