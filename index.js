const { exec } = require('child_process');
const core = require('@actions/core');

const fs = require('fs');
const yaml = require('js-yaml');

const segmentFunctionsURL = 'https://api.segmentapis.com/functions';
const contentType = 'application/json';

const defaultConfigFilePath = './segment-functions-config.yaml'

/**
 * This function retrieve the authorization token that will be used to authenticate with Segment.
 *
 * @returns {String} The raw authentication token.
 */
const authToken = () => {
    const token = core.getInput('authorization-token');
    if (!authToken) throw new Error('authorization token can not be blank');

    return token;
};

/**
 * This function validates a function setting.
 *
 * @param {Object} functionsSettings The path of the yaml file to be read and converted.
 */
var validateFunctionSettings = (functionsSettings) => {
    if (!functionsSettings.functionID) throw new Error('missing functionID');
    if (!functionsSettings.displayName) throw new Error('missing displayName');
    if (!functionsSettings.description) throw new Error('missing description');
    if (!functionsSettings.path) throw new Error('missing path');

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

/**
 * This functions is responsible for checking which files had changed between the current branch and the one that was
 * merged into the current branch and then listing the javascript and yaml files that had changed to be used later
 * as the payload to update the functions on Segment with the code and info of the function.
 *
 * @returns {[Object]} A list of objects containing the pair of javascript and yaml files that must be update into
 * Segment.
 */
const listChangedFunctionsAndSettings = async (filePath) => {
    core.info('reading configuration file: ', filePath);

    await execPromise('git fetch origin master');

    return fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);

            throw new Error('no configurations file defined');
        }

        const diffCommand = 'git diff --name-only --diff-filter=AM origin/master...HEAD';
        return execPromise(diffCommand).then(({ stdout }) => {
            const changedFiles = stdout.split('\n').filter(line => line.trim() !== '');

            var listOfFunctionsAndSettingsPath = {};

            try {
                listOfFunctionsAndSettingsPath = yaml.load(data);
            } catch (yamlErr) {
                throw new Error('error parsing configuration file:', yamlErr);
            }

            var functionsAndSettingsToUpdate = [];

            listOfFunctionsAndSettingsPath.functions.forEach(functionAndSettingsPath => {
                validateFunctionSettings(functionAndSettingsPath);

                const codeChanged = changedFiles.includes(functionAndSettingsPath.codePath);
                const settingsChanged = changedFiles.includes(functionAndSettingsPath.settingsPath);

                if (codeChanged || settingsChanged) {
                    functionsAndSettingsToUpdate.push({
                        codePath: functionAndSettingsPath.codePath,
                        settingPath: functionAndSettingsPath.settingsPath,
                    });
                }
            });

            return functionsAndSettingsToUpdate;
        });
    });
};

/**
 * This function extracts the source code from a function to be sent to Segment.
 *
 * @param {String} codePath The path of the function.
 * @returns {String} The source code of the function present at the given path.
 */
const extractCode = (codePath) => fs.readFileSync(codePath, 'utf8');

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
 * @param {String} codePath The path of the function that will be updated.
 * @param {String} settingsPath  The path of the yaml file that contains the configurations of the function.
 * @returns {Promise<void>} A promise that resolves when the function was successfully updated on Segment.
 */
const updateSegmentFunction = async (token, codePath, settingsPath) => {
    const code = extractCode(codePath);
    const settings = prepareSettings(settingsPath);

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

    handleResponse(response);
};

/**
 * This function checks all functions within the repository that had undergone changes in either the code or the
 * configurations to update them later on Segment with the new code and/or configurations.
 */
const updateSegmentFunctions = async () => {
    const token = authToken();
    const segmentFunctionsConfigPath = core.getInput('segment-functions-config-path');
    return listChangedFunctionsAndSettings(segmentFunctionsConfigPath || defaultConfigFilePath)
        .then(functionsAndSettings => {

        return functionsAndSettings.forEach(functionAndSettings => updateSegmentFunction(
                token,
                functionAndSettings.codePath,
                functionAndSettings.settingsPath,
            )
        );
    });
};

try {
    updateSegmentFunctions();
} catch (error) {
    core.setFailed(error.message);
}