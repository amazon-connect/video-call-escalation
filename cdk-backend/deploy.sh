#!/bin/bash

npm_run_build(){

    echo ""
    echo "build ${1}"
    echo ""

    npm run build
    if [ $? -eq 0 ]; then
        echo ""
        echo "${1} build successful"
        echo ""
    else
        echo ""
        echo "${1} build failed"
        echo ""
        exit 1
    fi
}

#build lambdas in cdk-backend
echo ""
echo "build lambdas in cdk-backend"
for i in  lambdas/*; do 
    base=$(basename "$i");
    cd $i;
    if [ -f "package.json" ]; then
        rm -rf build
        npm_run_build "${base}"
    else 
        echo "$base - package.json not found"
    fi
    cd -;
done

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