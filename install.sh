#!/bin/bash
set +x
#install agent frontend
echo "install agent frontend"
cd agent-app
npm install
cd ..
#install demo-website frontend
echo "install demo-website frontend"
cd demo-website
npm install
cd ..
#install cdk-frontend
echo "install cdk-frontend"
cd cdk-frontend
npm install
cd ..
#install cdk-backend
echo "install cdk-backend"
cd cdk-backend
npm install
#install lambdas in cdk-backend
echo "install lambdas in cdk-backend"
for i in  lambdas/*; do 
    base=$(basename "$i");
    echo "install lambdas in cdk-backend - $base"
    cd $i;
    if [ -f "package.json" ]; then
        npm install;
    elif [ -d "nodejs" ]; then
        cd nodejs
        if [ -f "package.json" ]; then
        npm install
        fi
    else 
        echo "$base - package.json not found"
    fi
    cd -;
done
