# AWS CDK stacks with all the backend and frontend resources

## Useful commands

 * `npm run install:all`                 install all necessary modules
 * `npm run build`                       compile typescript to js
 * `npm run configure`                   start the configuration script
 * `npm run sync-config`                 download frontend-config.js for local frontend testing (agent-app, demo-website)
 * `npm run build:frontend`              build frontend applications (agent-app, demo-website)
 * `npm run cdk:deploy`                  deploy backend and frontend stacks to your default AWS account/region
 * `npm run build:frontend:cdk:deploy`   build frontend applications and deploy stacks to your default AWS account/region

## Deploying with AWS CDK Pipelines

To simplify and automate the deployment, this solution supports AWS CDK Pipelines. 
AWS CDK Pipelines is a high-level construct library that makes it easy to set up a continuous deployment pipeline for AWS CDK applications.
More information in the official [AWS documentation](https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html).
By default, the pipeline is self-mutating, which means you only need to deploy cdk stacks one time, to get the pipeline started. 
After that, the pipeline automatically updates itself if you add new CDK applications or stages in the source code.

To deploy the solution with CDK Pipelines, please follow the steps: 

1. Complete the [Solution prerequisites](../README.md#Solution-prerequisites)
1. Clone the solution to your computer (using `git clone`)
1. Import Amazon Connect Contact Flows as described in [Solution setup](../README.md#Solution-setup)
1. Check AWS CLI as described in [Solution setup](../README.md#Solution-setup)
1. Install NPM packages as described in [Solution setup](../README.md#Solution-setup)

1. Configure CDK stacks
    - Set baseline parameters as described in **Configure CDK stacks** section of [Solution setup](../README.md#Solution-setup)
    - When prompted, provide the following parameters:
        - `cdk-pipeline-enabled`: set this parameter to `true` to enable CDK Pipeline based deployment
        - `cdk-pipeline-repository-name`: set the name of AWS CodeCommit Repository that CDK Pipelines fetches from. For instance `VideoCallEscalation`. This repository will be created as part of the pipeline.
        - `cdk-pipeline-repository-branch-name`: set the name of AWS CodeCommit Repository Branch that CDK Pipelines fetches from. For instance `main`
        - `cdk-pipeline-create-new-repository`: to create a new AWS CodeCommit Repository, set to `true`. To fetch from an existing AWS CodeCommit Repository, set to `false`
        - `cdk-pipeline-stage-name`: set the name of Stage in the CDK Pipelines. For instance, `Demo` or `Prod`
    - The script stores the deployment parameters to AWS System Manager Parameter Store

1. Deploy CDK Pipeline
    - In your terminal, navigate to `video-call-escalation/cdk-stacks`
    - Run the script: `npm run build:frontend`
    - This script builds frontend applications (agent-app, demo-website)
    - In case you started with a new environment, please bootstrap CDK: `cdk bootstrap`
    - Run the script: `npm run cdk:deploy`
    - This script deploys CDK Pipeline stack with the following resources:  
      `AWS CodeCommit Repository`, `AWS CodeCommit Repository User`, `AWS CDK Pipeline`,  
      with `CdkPipelineStage`, where `CdkPipelineStage` deploys `CdkBackendStack` and `CdkFrontendStack`
    - Wait for all resources to be provisioned before continuing to the next step

1. Generate credentials for AWS CodeCommit
    - The CDK Pipeline stack has provisioned an AWS CodeCommit Repository and a User for that repository, but the repository is empty at this point
    - You can use AWS CodeCommit as your primary repository, or you could setup a repository mirroring, to mirror all the updates from an external source into AWS CodeCommit
    - For the purpose of this guide, we are going to push the code directly into AWS CodeCommit repository
    - Login into your AWS Console
    - Navigate to IAM, then select `codecommit-user-{yourRepositoryName}` username
    - Select the Security credentials tab, and scroll to `HTTPS Git credentials for AWS CodeCommit` section
    - Click **Generate credentials** button
    - Please note: `This is the only time the password can be viewed or downloaded. You cannot recover it later. However, you can reset your password at any time.`
    - Save or download your credentials, and proceed to the next step

1. Configure Git remote and push the code to AWS CodeCommit
    - Login into your AWS Console and navigate to AWS CodeCommit
    - Find the repository name in the table, and click `HTTPS` in `Clone URL` column
    - The AWS CodeCommit Repository URL is stored in your clipboard
    - In your Terminal, navigate to `video-call-escalation`
    - To list current git remotes, run `git remote -v`
    - Typically, you would see `origin` and a URL pointing to the `origin` remote
    - At this point, you can `set-url` for `origin` to your AWS CodeCommit Repository URL, or you could create a new remote for your AWS CodeCommit Repository URL
    - For instance, to add a new remote, run `git remote add pipeline-demo {yourCodeCommitURL}`
    - Next time you run `git remote -v` you should be able to see two entries: `origin` and `pipeline-demo`
    - To push the code to AWS CodeCommit, assuming your `origin` branch is `master` and your `pipeline-demo` branch is `main`, you can run: `git push pipeline-demo master:main`
    - As soon as the code is pushed, the Pipeline checks out the code from AWS CodeCommit and deploys it
    - From this moment, any code pushed to `main` branch of AWS CodeCommit Repository, would start the Pipeline and deploy the updates, including the updates to Pipeline itself, since it's a self-mutating pipeline.

1. Continue with **Configure Amazon Connect Approved Origins** section of [Solution setup](../README.md#Solution-setup)
1. Optionally, complete **Configure API Allowed Origins** section of [Solution setup](../README.md#Solution-setup)
1. **Create a test agent (user)** as described in [Solution setup](../README.md#Solution-setup)
1. Finally, **Test the solution** as described in [Solution setup](../README.md#Solution-setup)






