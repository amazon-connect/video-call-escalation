#!/bin/bash
if [ -f "cdk.context.json" ]; then
    echo ""
    echo "INFO: Removing cdk.context.json"
    rm cdk.context.json
else
    echo ""
    echo "INFO: cdk.context.json not present, nothing to remove"
fi

#build lambdas in cdk-backend
echo ""
echo "build lambdas in cdk-backend"
for i in  lambdas/*; do 
    base=$(basename "$i");
    echo ""
    echo "build lambdas in cdk-backend - $base"
    echo ""
    cd $i;
    if [ -f "package.json" ]; then
        rm -rf build
        npm run build;
    else 
        echo "$base - package.json not found"
    fi
    cd -;
done

echo ""
echo "Deploying cdk-backend"
echo ""
cdk deploy -O ../agent-app/src/cdk-exports.json