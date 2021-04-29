// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const configParams = require('./config.params.json')
const { SSMClient, GetParameterCommand, PutParameterCommand, DeleteParameterCommand } = require('@aws-sdk/client-ssm')
const ssmClient = new SSMClient()
const fs = require('fs')
const readline = require("readline")

const SSM_NOT_DEFINED = 'not-defined'
let VERBOSE = false


function displayHelp() {
    console.log(`\nThis script gets deployment parameters and stores the parameters to AWS System Manager Parameter Store \n`)

    console.log(`Usage:\n`)
    console.log(`-i \t Run in interactive mode`)
    console.log(`-l \t When running in interactive mode, load the current parameters from AWS System Manager Parameter Store`)
    console.log(`-t \t Run Test mode (only creates config.cache.json, but it does not store parameters to AWS System Manager Parameter Store)`)
    console.log(`-d \t Delete all AWS SSM Parameters (after CDK stack was destroyed)`)
    displayParametersHelp()
    process.exit(0)
}

function displayParametersHelp() {
    console.log(`\nParameters: \n`)
    configParams.parameters.forEach(param => {
        console.log(`--${param.cliFormat} [${param.required ? 'required' : 'optional'}${param.parent ? ' when ' + getParentObject(param).cliFormat : ''}] \n\t\t${wrapText(param.description, 80)}\n`)
    })
}

function wrapText(s, w) {
    return s.replace(new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n\t\t')
}

function getParentObject(param) {
    return configParams.parameters.find(parent => parent.name === param.parent)
}

function isParentEnabled(param) {
    return configParams.parameters.find(parent => parent.name === param.parent).value === true
}

function isNotDefined(param) {
    return param.value === SSM_NOT_DEFINED
}

function isUndefinedNullEmpty(value){
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function throwParameterRequired(param) {

   throw new Error(`Required parameter not provided: [${param.cliFormat}]`)
}

async function loadParametersSSM() {
    console.log(`\nLoading current parameters from AWS System Manager Parameter Store\n`)

    for (const param of configParams.parameters) {
        console.log(`AWS SSM get ${configParams.hierarchy}${param.name}`)
        const loadedParam = await ssmClient.send(new GetParameterCommand({ Name: `${configParams.hierarchy}${param.name}` })).catch(error=>{
            console.log(error.message)
        })
        if(loadedParam!==undefined){
            param.value = parseParam(loadedParam.Parameter.Value)
        }
    }

    console.log(`\nLoad completed\n`)
}

async function storeParametersSSM() {
    console.log(`\nStoring parameters to AWS System Manager Parameter Store\n`)

    for (const param of configParams.parameters) {
        console.log(`AWS SSM put ${configParams.hierarchy}${param.name}`)
        //supports only String parameters
        await ssmClient.send(new PutParameterCommand({Type:'String', Name: `${configParams.hierarchy}${param.name}`, Value: param.boolean? param.value.toString() : param.value, Overwrite: true }))
    }

    console.log(`\nStore completed\n`)
}

async function deleteParametersSSM() {
    console.log(`\nDeleting parameters to AWS System Manager Parameter Store\n`)

    for (const param of configParams.parameters) {
        console.log(`AWS SSM delete ${configParams.hierarchy}${param.name}`)
        await ssmClient.send(new DeleteParameterCommand({ Name: `${configParams.hierarchy}${param.name}` }))
    }

    console.log(`\nDelete completed\n`)
    process.exit(0);
}

async function writeConfigCacheJSON() {
    console.log(`\nWriting current parameters to config.cache.json\n`)

    const configCache = {}
    for (const param of configParams.parameters) {
        configCache[`${configParams.hierarchy}${param.name}`] = param.value
    }

    fs.writeFileSync('config.cache.json', JSON.stringify(configCache, null, '\t'))

    console.log(`\nWrite completed\n`)
}

function checkRequiredParameters() {

    for (const param of configParams.parameters) {
        if (param.required && !param.parent && isNotDefined(param)) {
            throwParameterRequired(param)
        }

        if (param.required && param.parent && isParentEnabled(param) && isNotDefined(param)) {
            throwParameterRequired(param)
        }
    }
}

function initParameters() {
    for (const param of configParams.parameters) {
        param.value = isUndefinedNullEmpty(param.defaultValue) ? SSM_NOT_DEFINED : param.defaultValue
    }
}

function displayInputParameters() {
    console.log(`\nInput parameters:\n`)

    for (const param of configParams.parameters) {
        console.log(`${param.cliFormat} = ${param.value}`)
    }
}

function parseParam(value) {
    let tValue = value.trim()
    if (typeof tValue === 'string' && tValue.toLocaleLowerCase() === 'true') return true
    if (typeof tValue === 'string' && tValue.toLowerCase() === 'false') return false
    return tValue
}

function getArgs() {
    const argFlags = {}
    const argParams = {}

    process.argv
        .slice(2, process.argv.length)
        .forEach(arg => {
            // long args
            if (arg.slice(0, 2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2, longArg[0].length);
                const longArgValue = longArg.length > 1 ? parseParam(longArg[1]) : true;
                argParams[longArgFlag] = longArgValue;
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1, arg.length).split('');
                flags.forEach(flag => {
                    argFlags[flag] = true;
                });
            }
        });
    return { argFlags: argFlags, argParams: argParams };
}

async function runInteractive(loadSSM = false) {
    console.log(`\nRunning in interactive mode\n`)

    if (loadSSM) {
        await loadParametersSSM()
    }
    await promptForParameters()
}

function buildQuestion(question, rl) {
    return new Promise((res, rej) => {
        rl.question(question, input => {
            res(input);
        })
    });
}

async function promptForParameters() {
    console.log(`\nPlease provide your parameters:\n`)

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    for (const param of configParams.parameters) {
        if (!param.parent || (param.parent && isParentEnabled(param))) {
            const input = await buildQuestion(`${param.cliFormat} [${param.value}]`, rl)
            if (input.trim() !== '') {
                param.value = parseParam(input)
            }
        }
    }

    rl.close()
}

function processArgParams(argParams) {

    for (const param of configParams.parameters) {
        const argValue = argParams[param.cliFormat]
        if (argValue !== undefined) {
            param.value = argValue
        }
    }
}

async function run() {
    try {
        const { argFlags, argParams } = getArgs();

        if (argFlags['v'] === true) {
            VERBOSE = true
        }

        if (argFlags['h'] === true) {
            return displayHelp()
        }

        if (argFlags['d'] === true) {
            return await deleteParametersSSM()
        }

        if (argFlags['t'] === true) {
            console.log(`\nRunning in test mode\n`)
        }

        initParameters()

        if (argFlags['i'] === true) {
            console.log(`\nRunning in interactive mode\n`)
            await runInteractive(argFlags['l'])
        }
        else {
            processArgParams(argParams)
        }

        displayInputParameters()

        checkRequiredParameters()

        writeConfigCacheJSON()

        if (argFlags['t'] !== true) {
            await storeParametersSSM()
        }

        console.log(`\nConfiguration complete, review your parameters in config.cache.json\n`)
        process.exit(0)
    }
    catch(error){
        console.error(`\nError: ${error.message}\n`)
        if (VERBOSE) console.log(error)
        process.exit(1)
    }
    
}

run()



