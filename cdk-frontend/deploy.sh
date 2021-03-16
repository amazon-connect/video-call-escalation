#!/bin/bash

display_help(){
    echo ""
    echo "This script deploys cdk-frontend stack. That includes agent-app and demo-website"
    echo "The cdk-frontend stack S3-deployment sources are: /agent-app/build and /demo-website/build"
    echo "You can build the apps manually, by executing npm run build, for both agent-app and demo-website"
    echo "Optionally, you can pass -b (--build) parameter to this script, to build both apps automatically"
    echo ""
    exit 0
}

run_build=false

for i in "$@"
do
    case "$i" in
        --build|-b)
        run_build=true
        shift
        ;;
        --help|-h)
        display_help
        exit 0
        ;;
        *) #unknown parameter
            printf "***************************\n"
            printf "* Error: Invalid parameter: ${i} \n"
            printf "***************************\n"
            exit 1
        ;;
    esac
done

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

if [ "$run_build" = true ]; then
    cd ../agent-app
    npm_run_build "agent-app"

    cd ../demo-website
    npm_run_build "demo-website"

    cd ../cdk-frontend
fi

echo ""
echo "Deploying cdk-frontend"
echo ""
cdk deploy