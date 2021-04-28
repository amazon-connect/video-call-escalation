# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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