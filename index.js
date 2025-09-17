const { exec } = require('child_process');
const core = require('@actions/core');

const fs = require('fs');
const yaml = require('js-yaml');

const segmentFunctionsURL = 'https://api.segmentapis.com/functions';
const contentType = 'application/json';
const trunkBranch = core.getInput('trunk-branch');

/**
 * This function retrieve the authorization token that will be used to authenticate with Segment.
 *
 * @returns {String} The raw authentication token.
 */
const authToken = () => {
    const token = core.getInput('authorization-token');
    if (!token) throw new Error('authorization token can not be blank');

    return token;
};

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);

            return reject(stderr);
        }

        resolve({ stdout, stderr });
        });
    });
}

const listOfChangedFiles = async () => {
    const diffCommand = 'git diff --name-only --diff-filter=AM origin/' + trunkBranch +'...HEAD';
    const { stdout } = await execPromise(diffCommand)
    const changedFiles = stdout.split('\n').filter(line => line.trim() !== '');

    return changedFiles
}

/**
 * This function validates a function setting.
 *
 * @param {Object} functionsSettings The path of the yaml file to be read and converted.
 */
var validateFunctionSettings = (functionsSettings) => {
    if (!functionsSettings.functionID) throw new Error('missing functionID');
    if (!functionsSettings.displayName) throw new Error('missing displayName');
    if (!functionsSettings.description) throw new Error('missing description');

    if (functionsSettings.settings) {
        functionsSettings.settings.forEach(setting => {
            if (!setting.name) throw new Error('settings present but missing name');
            if (!setting.label) throw new Error('settings present but missing label');
            if (!setting.description) throw new Error('settings present but missing description');
            if (!setting.required) throw new Error('settings present but missing required');
            if (!setting.sensitive) throw new Error('settings present but missing sensitive');
            if (!setting.type) throw new Error('settings present but missing type');
        });
    };
};

/**
 * This function extracts the source code from a function to be sent to Segment.
 *
 * @param {String} codePath The path of the function.
 * @returns {String} The source code of the function present at the given path.
 */
const extractCode = (codePath) => fs.readFileSync(codePath, 'utf8');

/**
 * This functions is responsible for checking which files had changed between the current branch and the one that was
 * merged into the current branch and then listing the javascript and yaml files that had changed to be used later
 * as the payload to update the functions on Segment with the code and info of the function.
 *
 * @returns {Promise[Object]} A list of objects containing the pair of javascript and yaml files that must be update into
 * Segment.
 */
const listChangedFunctionsAndSettings = async (filePath) => {
    core.info('reading configuration file: ' + filePath);

    // await execPromise('git fetch origin ' + trunkBranch)

    const functionsAndSettingsToUpdate = [];
    const data = fs.readFileSync(filePath, 'utf8');
    var listOfFunctionsAndSettingsPath = {};

    try {
        listOfFunctionsAndSettingsPath = yaml.load(data);
    } catch (yamlErr) {
        throw new Error('error parsing configuration file:', yamlErr);
    }

    await Promise.all(listOfFunctionsAndSettingsPath.functions.map(async functionAndSettingsPath => {
        const changedFiles = await listOfChangedFiles();
        const codeChanged = changedFiles.includes(functionAndSettingsPath.codePath);
        const settingsChanged = changedFiles.includes(functionAndSettingsPath.settingsPath);

        if (codeChanged || settingsChanged) {
            const settingsData = await fs.readFileSync(functionAndSettingsPath.settingsPath, 'utf8');
            var settings = {};
            try {
                settings = yaml.load(settingsData);
            } catch (yamlErr) {
                throw new Error('error parsing configuration file:', yamlErr);
            }

            validateFunctionSettings(settings);

            const code = extractCode(functionAndSettingsPath.codePath);

            functionsAndSettingsToUpdate.push({
                code: code,
                settings: settings,
            });
        }
    }));

    return functionsAndSettingsToUpdate;
};

/**
 * This function is responsible for generating the URL that will be used to update a function on Segment.
 *
 * @param {String} functionID The ID of the function that will be updated.
 * @returns {String} The URL that will be used to update the function on Segment.
 */
const buildSegmentPatchURL = (functionID) => `${segmentFunctionsURL}/${functionID}`;

/**
 * This function checks if the response returned by Segment was OK and the function was properly updated.
 *
 * @param {Response} response The response from Segment request.
 */
const handleResponse = async (response) => {
    const status = response.status;

    if (status !== 200) {
        const body = await response.json();
        let errors = '';

        body.errors.forEach(error => {
        core.info(`error: ${error}`);
        errors += error.message;
        });

        throw new Error(`function was not updated, status code: [${status}], errors: [${errors}]`);
    }
};

/**
 * This function updates a function on Segment with the new code and configurations.
 *
 * @param {String} token The authentication token that will be used to authenticate with Segment.
 * @param {String} code The path of the function that will be updated.
 * @param {object} settings  All settings associated with tthe function to be updated.
 * @returns {Promise<void>} A promise that resolves when the function was successfully updated on Segment.
 */
const updateSegmentFunction = async (token, code, settings) => {
    core.info('updating segment functions');

    const method = 'PATCH';
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
    };
    const payload = {
        code,
        ...settings,
    };

    const options = {
        method,
        headers,
        body: JSON.stringify(payload),
    };

    const response = await fetch(
        buildSegmentPatchURL(settings.functionID),
        options,
    );

    await handleResponse(response);
};

/**
 * This function checks all functions within the repository that had undergone changes in either the code or the
 * configurations to update them later on Segment with the new code and/or configurations.
 */
const updateSegmentFunctions = async () => {
    const token = authToken();
    const segmentFunctionsConfigPath = core.getInput('segment-functions-config-path');
    const functionsAndSettings = await listChangedFunctionsAndSettings(segmentFunctionsConfigPath);

    await Promise.all(functionsAndSettings.map(async functionAndSettings => {
        await updateSegmentFunction(
            token,
            functionAndSettings.code,
            functionAndSettings.settings,
        );
    }));
};

try {
    updateSegmentFunctions();
} catch (error) {
    core.setFailed(error.message);
}