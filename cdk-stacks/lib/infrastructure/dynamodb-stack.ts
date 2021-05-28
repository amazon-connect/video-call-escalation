// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as ddb from '@aws-cdk/aws-dynamodb'

export interface DynamoDBStackProps extends cdk.NestedStackProps {
    readonly SSMParams: any;
    readonly cdkAppName: string;
}

export class DynamoDBStack extends cdk.NestedStack {
    public readonly appTable: ddb.ITable;

    constructor(scope: cdk.Construct, id: string, props: DynamoDBStackProps) {
        super(scope, id, props);

        //Create App Table
        const appTable = new ddb.Table(this, 'AppTable', {
            tableName: `${props.cdkAppName}DB`,
            partitionKey: { name: 'PK', type: ddb.AttributeType.STRING },
            sortKey: { name: 'SK', type: ddb.AttributeType.STRING },
            timeToLiveAttribute: 'TTL',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: ddb.BillingMode.PAY_PER_REQUEST
        });

        this.appTable = appTable;
    }
}