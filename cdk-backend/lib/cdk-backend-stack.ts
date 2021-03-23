// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const configParams = require('../config.params.json')

import * as cdk from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway'
import * as cognito from '@aws-cdk/aws-cognito'
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as ssm from '@aws-cdk/aws-ssm'
import * as apigw2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw2i from "@aws-cdk/aws-apigatewayv2-integrations";

export class CdkBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //retrieve SSM parameters
    const SSM_NOT_DEFINED = 'not-defined';

    const loadSSMParams = () => {
      const params:any = {}
      for (const param of configParams.parameters) {
        if(param.boolean){
          params[param.name] = (ssm.StringParameter.valueFromLookup(this, `${configParams.hierarchy}${param.name}`).toLowerCase() === "true");
        }
        else{
          params[param.name] = ssm.StringParameter.valueFromLookup(this, `${configParams.hierarchy}${param.name}`)
        }
      }
      return params
    }

    //load SSM Parameters
    const SSMParams = loadSSMParams()

    /**************************************************************************************************************
    * Cognito Resources *
    **************************************************************************************************************/

    //create a User Pool
    const userPool = new cognito.UserPool(this, 'VideoCallEscalationUserPool', {
      signInAliases: {
        username: false,
        phone: false,
        email: true
      },
      standardAttributes: {
        email: {
          required: false,   //Cognito bug with federation - If you make a user pool with required email field then the second google login attempt fails (https://github.com/aws-amplify/amplify-js/issues/3526)
          mutable: true
        }
      },
      userInvitation: {
        emailSubject: "Your VideoCallEscalation temporary password",
        emailBody: "Your VideoCallEscalation username is {username} and temporary password is {####}"
      },
      userVerification: {
        emailSubject: "Verify your new VideoCallEscalation account",
        emailBody: "The verification code to your new VideoCallEscalation account is {####}"
      }
    });

    //SAML Federation
    let cognitoSAML: cognito.CfnUserPoolIdentityProvider | undefined = undefined;
    let supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] = [];
    let userPoolClientOAuthConfig: cognito.OAuthSettings = {
      scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.COGNITO_ADMIN]
    }
    if (SSMParams.cognitoSAMLEnabled) {
      cognitoSAML = new cognito.CfnUserPoolIdentityProvider(this, "CognitoSAML", {
        providerName: SSMParams.cognitoSAMLIdentityProviderName,
        providerType: 'SAML',
        providerDetails: {
          MetadataURL: SSMParams.cognitoSAMLIdentityProviderURL
        },
        attributeMapping: {
          "email": "email",
          "email_verified": "email_verified",
          "name": "name"
        },
        userPoolId: userPool.userPoolId
      })
      supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.custom(cognitoSAML.providerName));
      userPoolClientOAuthConfig = {
        ...userPoolClientOAuthConfig,
        callbackUrls: SSMParams.cognitoSAMLCallbackUrls.split(',').map((item: string) => item.trim()),
        logoutUrls: SSMParams.cognitoSAMLLogoutUrls.split(',').map((item: string) => item.trim())
      }
    }

    const userPoolClient = new cognito.UserPoolClient(this, 'VideoCallEscalationUserPoolAmplifyFrontend', {
      userPool: userPool,
      userPoolClientName: 'amplifyFrontend',
      generateSecret: false,
      supportedIdentityProviders: supportedIdentityProviders,
      oAuth: userPoolClientOAuthConfig
    })

    if (cognitoSAML) {
      userPoolClient.node.addDependency(cognitoSAML);
    }

    const userPoolDomain = new cognito.CfnUserPoolDomain(this, "VideoCallEscalationUserPoolDomain", {
      domain: SSMParams.cognitoDomainPrefix,
      userPoolId: userPool.userPoolId
    })

    //create an Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'VideoCallEscalationIdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName
      }],

    });

    //Cognito Identity Pool Roles
    const unauthenticatedRole = new iam.Role(this, 'CognitoDefaultUnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": { "cognito-identity.amazonaws.com:aud": identityPool.ref },
        "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "unauthenticated" },
      }, "sts:AssumeRoleWithWebIdentity")
    });

    unauthenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "mobileanalytics:PutEvents",
        "cognito-sync:*"
      ],
      resources: ["*"]
    }));

    const authenticatedRole = new iam.Role(this, "CognitoDefaultAuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": { "cognito-identity.amazonaws.com:aud": identityPool.ref },
        "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" },
      }, "sts:AssumeRoleWithWebIdentity")
    });

    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "mobileanalytics:PutEvents",
        "cognito-sync:*",
        "cognito-identity:*"
      ],
      resources: ["*"]
    }));

    const defaultPolicy = new cognito.CfnIdentityPoolRoleAttachment(this, 'DefaultValid', {
      identityPoolId: identityPool.ref,
      roles: {
        'unauthenticated': unauthenticatedRole.roleArn,
        'authenticated': authenticatedRole.roleArn
      }
    });

    /**************************************************************************************************************
    * Lambda Resources *
    **************************************************************************************************************/

    //create Utility Layer
    const utilityLayer = new lambda.LayerVersion(this, 'VideoCallEscalationUtilityLayer', {
      code: lambda.Code.fromAsset('lambdas/utility-layer/build'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_12_X]
    });

    //create connectAPI Lambda
    const connectAPILambda = new lambda.Function(this, 'ConnectAPILambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambdas/connectapi-lambda/build'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      layers: [utilityLayer],
      environment: {
        ConnectInstanceId: SSMParams.connectInstanceARN.split('/')[1]
      }
    });

    //Allow connectAPILambda to invoke Amazon Connect
    connectAPILambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectAPIAccess', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["connect:GetFederationToken"],
          resources: [SSMParams.connectInstanceARN + '/user/*']
        })
      ]
    }));

    //Allow connectAPILambda to invoke STS
    connectAPILambda.role?.attachInlinePolicy(new iam.Policy(this, 'STSAccess', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [SSMParams.connectAPILambdaRoleToAssume === SSM_NOT_DEFINED ? connectAPILambda.role.roleArn : SSMParams.connectAPILambdaRoleToAssume]
        })
      ]
    }));

    //add env variable - RoleToAssume
    connectAPILambda.addEnvironment('RoleToAssume', SSMParams.connectAPILambdaRoleToAssume === SSM_NOT_DEFINED ? connectAPILambda.role?.roleArn || '' : SSMParams.connectAPILambdaRoleToAssume);

    //create ConnectAPI Integration
    const videoCallEscalationConnectAPI = new apigw2.HttpApi(this, 'VideoCallEscalationConnectAPI', {
      corsPreflight: {
        allowOrigins: SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
        allowMethods: [apigw2.HttpMethod.POST],
        allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
      }
    });

    const videoCallEscalationConnectAPIIntegration = new apigw2i.LambdaProxyIntegration({
      handler: connectAPILambda
    });

    const videoCallEscalationConnectAPI_CCPLoginResource_PostMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationConnectAPI_CCPLoginResource_PostMethod', {
      httpApi: videoCallEscalationConnectAPI,
      integration: videoCallEscalationConnectAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/ccplogin', apigw2.HttpMethod.POST)
    })

    const videoCallEscalationConnectAPI_CCPLoginResource_PostMethodCfn = videoCallEscalationConnectAPI_CCPLoginResource_PostMethod.node.defaultChild as apigw2.CfnRoute
    videoCallEscalationConnectAPI_CCPLoginResource_PostMethodCfn.authorizationType = 'AWS_IAM'

    //Allow Identity Pool to invoke VideoCallEscalationConnectAPI Login resource
    authenticatedRole.attachInlinePolicy(new iam.Policy(this, 'VideoCallEscalationConnectAPI_CCPLoginResources', {
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${videoCallEscalationConnectAPI.httpApiId}/$default/${videoCallEscalationConnectAPI_CCPLoginResource_PostMethodCfn.routeKey.replace(/\s+/g, '')}`]
      })]
    }));


    /**************************************************************************************************************
      * Chime Resources *
    **************************************************************************************************************/
    //Create Meetings Table

    const meetingsTable = new ddb.Table(this, 'vceMeetings', {
      partitionKey: { name: 'Title', type: ddb.AttributeType.STRING },
      timeToLiveAttribute: 'TTL',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: ddb.BillingMode.PAY_PER_REQUEST
    })

    const attendeesTable = new ddb.Table(this, 'vceAttendees', {
      partitionKey: { name: 'AttendeeId', type: ddb.AttributeType.STRING },
      timeToLiveAttribute: 'TTL',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: ddb.BillingMode.PAY_PER_REQUEST
    })

    //Create Attendees Table

    //create chimeAPI Lambda
    const chimeAPILambda = new lambda.Function(this, 'ChimeAPILambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambdas/chimeapi-lambda/build'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      layers: [utilityLayer],
      environment: {
        DDB_MEETINGS_TABLE: meetingsTable.tableName,
        DDB_ATTENDEES_TABLE: attendeesTable.tableName
      }
    });

    //Create Routes Table

    const routesTable = new ddb.Table(this, 'vceRoutes', {
      partitionKey: { name: 'RouteId', type: ddb.AttributeType.NUMBER },
      timeToLiveAttribute: 'TTL',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: ddb.BillingMode.PAY_PER_REQUEST
    })

    //Grant chimeAPI Lambda to DynamoDB tables
    meetingsTable.grantReadWriteData(chimeAPILambda);
    attendeesTable.grantReadWriteData(chimeAPILambda);


    //Grant chimeAPI Lambda to Chime
    chimeAPILambda.role?.attachInlinePolicy(new iam.Policy(this, 'ChimeAccess', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['chime:CreateMeeting', 'chime:CreateMeetingWithAttendees', 'chime:DeleteMeeting', 'chime:CreateAttendee'],
          resources: ['*']
        })
      ]
    }));

    //create chimeAPI Integration

    const videoCallEscalationChimeAPI = new apigw2.HttpApi(this, 'VideoCallEscalationChimeAPI', {
      corsPreflight: {
        allowOrigins: SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
        allowMethods: [apigw2.HttpMethod.POST, apigw2.HttpMethod.GET, apigw2.HttpMethod.DELETE],
        allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
      }
    });

    const videoCallEscalationChimeAPIIntegration = new apigw2i.LambdaProxyIntegration({
      handler: chimeAPILambda
    });

    //create chimeAPI Meeting Resources

    const videoCallEscalationChimeAPI_MeetingResource_PostMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationChimeAPI_MeetingResource_PostMethod', {
      httpApi: videoCallEscalationChimeAPI,
      integration: videoCallEscalationChimeAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/meeting', apigw2.HttpMethod.POST)
    });
    const videoCallEscalationChimeAPI_MeetingResource_PostMethodCfn = videoCallEscalationChimeAPI_MeetingResource_PostMethod.node.defaultChild as apigw2.CfnRoute
    videoCallEscalationChimeAPI_MeetingResource_PostMethodCfn.authorizationType = 'AWS_IAM'

    const videoCallEscalationChimeAPI_MeetingResource_DeleteMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationChimeAPI_MeetingResource_DeleteMethod', {
      httpApi: videoCallEscalationChimeAPI,
      integration: videoCallEscalationChimeAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/meeting', apigw2.HttpMethod.DELETE)
    })
    const videoCallEscalationChimeAPI_MeetingResource_DeleteMethodCfn = videoCallEscalationChimeAPI_MeetingResource_DeleteMethod.node.defaultChild as apigw2.CfnRoute
    videoCallEscalationChimeAPI_MeetingResource_DeleteMethodCfn.authorizationType = 'AWS_IAM'

    //Allow Identity Pool to invoke VideoCallEscalationChimeAPI Meeting resources
    authenticatedRole.attachInlinePolicy(new iam.Policy(this, 'VideoCallEscalationChimeAPI_MeetingResources', {
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${videoCallEscalationChimeAPI.httpApiId}/$default/${videoCallEscalationChimeAPI_MeetingResource_PostMethodCfn.routeKey.replace(/\s+/g, '')}`,
          `arn:aws:execute-api:${this.region}:${this.account}:${videoCallEscalationChimeAPI.httpApiId}/$default/${videoCallEscalationChimeAPI_MeetingResource_DeleteMethodCfn.routeKey.replace(/\s+/g, '')}`,
        ]
      })]
    }));

    //create chimeAPI Attendee Resources

    const videoCallEscalationChimeAPI_AttendeeResource_GetMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationChimeAPI_AttendeeResource_GetMethod', {
      httpApi: videoCallEscalationChimeAPI,
      integration: videoCallEscalationChimeAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/attendee', apigw2.HttpMethod.GET)
    });
    const videoCallEscalationChimeAPI_AttendeeResource_GetMethodCfn = videoCallEscalationChimeAPI_AttendeeResource_GetMethod.node.defaultChild as apigw2.CfnRoute
    videoCallEscalationChimeAPI_AttendeeResource_GetMethodCfn.authorizationType = 'AWS_IAM'

    const videoCallEscalationChimeAPI_AttendeeResource_PostMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationChimeAPI_AttendeeResource_PostMethod', {
      httpApi: videoCallEscalationChimeAPI,
      integration: videoCallEscalationChimeAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/attendee', apigw2.HttpMethod.POST)
    });
    const videoCallEscalationChimeAPI_AttendeeResource_PostMethodCfn = videoCallEscalationChimeAPI_AttendeeResource_PostMethod.node.defaultChild as apigw2.CfnRoute
    videoCallEscalationChimeAPI_AttendeeResource_PostMethodCfn.authorizationType = 'AWS_IAM'

    //Allow Identity Pool to invoke VideoCallEscalationChimeAPI Attendee resources
    authenticatedRole.attachInlinePolicy(new iam.Policy(this, 'VideoCallEscalationChimeAPI_AttendeeResources', {
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${videoCallEscalationChimeAPI.httpApiId}/$default/${videoCallEscalationChimeAPI_AttendeeResource_GetMethodCfn.routeKey.replace(/\s+/g, '')}`,
          `arn:aws:execute-api:${this.region}:${this.account}:${videoCallEscalationChimeAPI.httpApiId}/$default/${videoCallEscalationChimeAPI_AttendeeResource_PostMethodCfn.routeKey.replace(/\s+/g, '')}`,
        ]
      })]
    }));

    /**************************************************************************************************************
      * Public Chime API Resources *
    **************************************************************************************************************/
    //create chimeAPI Integration

    const videoCallEscalationMeetingAPI = new apigw2.HttpApi(this, 'VideoCallEscalationMeetingAPI', {
      corsPreflight: {
        allowOrigins: SSMParams.websiteAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
        allowMethods: [apigw2.HttpMethod.POST, apigw2.HttpMethod.GET],
        allowHeaders: apigw.Cors.DEFAULT_HEADERS
      }
    });

    const videoCallEscalationMeetingAPIIntegration = new apigw2i.LambdaProxyIntegration({
      handler: chimeAPILambda
    });

    const videoCallEscalationMeetingAPI_JoinResource_PostMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationMeetingAPI_JoinResource_PostMethod', {
      httpApi: videoCallEscalationMeetingAPI,
      integration: videoCallEscalationMeetingAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/join', apigw2.HttpMethod.POST)
    })

    const VideoCallEscalationMeetingAPI_AttendeeResource_GetMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationMeetingAPI_AttendeeResource_GetMethod', {
      httpApi: videoCallEscalationMeetingAPI,
      integration: videoCallEscalationMeetingAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/attendee', apigw2.HttpMethod.GET)
    })

    /**************************************************************************************************************
      * Public Chat API Resources *
    **************************************************************************************************************/

    //create chatAPI Lambda
    const chatAPILambda = new lambda.Function(this, 'ChatAPILambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambdas/chatapi-lambda/build'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      layers: [utilityLayer],
      environment: {
        ConnectInstanceId: SSMParams.connectInstanceARN.split('/')[1],
        DDB_ROUTES_TABLE: routesTable.tableName,
      }
    });

    routesTable.grantReadWriteData(chatAPILambda);

    //Allow chatAPI to invoke Amazon Connect
    chatAPILambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectChatAPIAccess', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["connect:StartChatContact"],
          resources: [SSMParams.connectInstanceARN + '/*']
        })
      ]
    }));

    const videoCallEscalationChatAPI = new apigw2.HttpApi(this, 'VideoCallEscalationChatAPI', {
      corsPreflight: {
        allowOrigins: SSMParams.websiteAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
        allowMethods: [apigw2.HttpMethod.POST],
        allowHeaders: apigw.Cors.DEFAULT_HEADERS
      }
    });

    const videoCallEscalationChatAPIIntegration = new apigw2i.LambdaProxyIntegration({
      handler: chatAPILambda
    });

    const videoCallEscalationChatAPI_StartResource_PostMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationChatAPI_StartResource_PostMethod', {
      httpApi: videoCallEscalationChatAPI,
      integration: videoCallEscalationChatAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/start', apigw2.HttpMethod.POST)
    })

    /**************************************************************************************************************
      * Routing API Resources *
    **************************************************************************************************************/

    //create routingAPI Lambda
    const routingAPILambda = new lambda.Function(this, 'RoutingAPILambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambdas/routingapi-lambda/build'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      layers: [utilityLayer],
      environment: {
        DDB_ROUTES_TABLE: routesTable.tableName,
      }
    })

    routesTable.grantReadWriteData(routingAPILambda);

    const videoCallEscalationRoutingAPI = new apigw2.HttpApi(this, 'VideoCallEscalationRoutingAPI', {
      corsPreflight: {
        allowOrigins: SSMParams.agentAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
        allowMethods: [apigw2.HttpMethod.POST],
        allowHeaders: apigw.Cors.DEFAULT_HEADERS.concat(['cognitoIdToken'])
      }
    })

    const videoCallEscalationRoutingAPIIntegration = new apigw2i.LambdaProxyIntegration({
      handler: routingAPILambda
    })

    const videoCallEscalationRoutingAPI_AdHoc_PostMethod = new apigw2.HttpRoute(this, 'VideoCallEscalationRoutingAPI_AdHoc_PostMethod', {
      httpApi: videoCallEscalationRoutingAPI,
      integration: videoCallEscalationRoutingAPIIntegration,
      routeKey: apigw2.HttpRouteKey.with('/adhoc', apigw2.HttpMethod.POST)
    })

    const videoCallEscalationRoutingAPI_AdHoc_PostMethodCfn = videoCallEscalationRoutingAPI_AdHoc_PostMethod.node.defaultChild as apigw2.CfnRoute
    videoCallEscalationRoutingAPI_AdHoc_PostMethodCfn.authorizationType = 'AWS_IAM'

    //Allow Identity Pool to invoke VideoCallEscalationRoutingAPI resource
    authenticatedRole.attachInlinePolicy(new iam.Policy(this, 'videoCallEscalationRoutingAPI_AdHocResources', {
      statements: [new iam.PolicyStatement({
        effect : iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${videoCallEscalationRoutingAPI.httpApiId}/$default/${videoCallEscalationRoutingAPI_AdHoc_PostMethodCfn.routeKey.replace(/\s+/g, '')}`]
      })]
    }));


    /**************************************************************************************************************
      * CDK Outputs *
    **************************************************************************************************************/

    //Outputs
    new cdk.CfnOutput(this, 'identityPoolId', {
      value: identityPool.ref
    })

    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId
    });

    new cdk.CfnOutput(this, 'userPoolWebClientId', {
      value: userPoolClient.userPoolClientId
    })

    new cdk.CfnOutput(this, 'videoCallEscalationConnectAPI', {
      value: `${videoCallEscalationConnectAPI.apiEndpoint}/`
    })

    new cdk.CfnOutput(this, 'videoCallEscalationChimeAPI', {
      value: `${videoCallEscalationChimeAPI.apiEndpoint}/`
    })

    new cdk.CfnOutput(this, 'videoCallEscalationMeetingAPI', {
      value: `${videoCallEscalationMeetingAPI.apiEndpoint}/`
    })

    new cdk.CfnOutput(this, 'videoCallEscalationChatAPI', {
      value: `${videoCallEscalationChatAPI.apiEndpoint}/`
    })

    new cdk.CfnOutput(this, 'videoCallEscalationRoutingAPI', {
      value: `${videoCallEscalationRoutingAPI.apiEndpoint}/`
    })

    new cdk.CfnOutput(this, 'backendRegion', {
      value: this.region
    })

    new cdk.CfnOutput(this, 'connectInstanceARN', {
      value: SSMParams.connectInstanceARN
    })

    new cdk.CfnOutput(this, 'connectInstanceURL', {
      value: SSMParams.connectInstanceURL
    })

    new cdk.CfnOutput(this, 'cognitoDomainURL', {
      value: `https://${userPoolDomain.domain}.auth.${this.region}.amazoncognito.com`
    })

    new cdk.CfnOutput(this, 'cognitoSAMLEnabled', {
      value: String(SSMParams.cognitoSAMLEnabled)
    })

    new cdk.CfnOutput(this, 'cognitoSAMLIdentityProviderName', {
      value: SSMParams.cognitoSAMLIdentityProviderName
    })

    new cdk.CfnOutput(this, 'connectDefaultContactFlowId', {
      value: SSMParams.connectDefaultContactFlowId
    })

    new cdk.CfnOutput(this, 'websiteAdHocRouteBaseURL', {
      value: SSMParams.websiteAdHocRouteBaseURL
    })

  }
}
