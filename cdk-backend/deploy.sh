#!/bin/bash
if [ -f "cdk.context.json" ]; then
    echo ""
    echo "INFO: Removing cdk.context.json"
    rm cdk.context.json
else
    echo ""
    echo "INFO: cdk.context.json not present, nothing to remove"
fi
echo ""
echo "Deploying cdk-backend"
echo ""
cdk deploy -O ../agent-app/src/cdk-exports.json