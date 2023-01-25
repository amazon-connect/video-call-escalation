// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';

export interface ConnectAPIUpdateStackProps extends cdk.NestedStackProps {
    readonly ccpLambdaRoleArn: string | undefined;
}

export class ConnectAPIUpdateStack extends cdk.NestedStack {

    constructor(scope: cdk.Construct, id: string, props: ConnectAPIUpdateStackProps) {
        super(scope, id, props);

        const ccpLambdaRoleArn = props.ccpLambdaRoleArn || ''

        const ccpLambdaRoleImported = iam.Role.fromRoleArn(
          this,
          'ccpLambdaRole',
          ccpLambdaRoleArn,
          {mutable: true}
        ) as iam.Role;

        //This is currently not updating the policy, adding manual instructions
        ccpLambdaRoleImported.assumeRolePolicy?.addStatements(
          new iam.PolicyStatement({
              actions: ['sts:AssumeRole'],
              effect: iam.Effect.ALLOW,
              principals: [new iam.ArnPrincipal(ccpLambdaRoleArn)],
          }),
        );
      //ccpLambdaRoleImported.grantAssumeRole(new iam.ArnPrincipal(ccpLambdaRoleArn))

      //new cdk.CfnOutput(this, "ccpLambdaRoleOutput", {
      //      value: ccpLambdaRoleImported.roleArn
      // });

    }
}
