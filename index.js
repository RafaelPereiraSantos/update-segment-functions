const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const fs = require('fs');
const yaml = require('js-yaml');

const segmentFunctionsURL = 'https://api.segmentapis.com/functions';
const contentType = 'application/json';

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
 * This functions is responsible for checking which files had changed between the current branch and the one that was
 * merged into the current branch and then listing the javascript and yaml files that had changed to be used later
 * as the payload to update the functions on Segment with the code and info of the function.
 *
 * @returns {[Object]} A list of objects containing the pair of javascript and yaml files that must be update into
 * Segment.
 */
const listChangedFunctionsAndSettings = async () => {
  core.info('listChangedFunctionsAndSettings1');

  const octokit = github.getOctokit(core.getInput('github_token'));
  core.info('listChangedFunctionsAndSettings11');
  const { data: changedFiles } = await octokit.rest.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: pull_request.number,
  });

  core.info('listChangedFunctionsAndSettings111');

  const configFile = file => /.yaml$|.YAML$|.yml$/i.test(file);
  const codeFile = file => /.js$/i.test(file);
  const testFile = file => /.test.js/i.test(file);
  const onlyCodeFile = file => codeFile(file) && !testFile(file);
  const configOrCodeFile = file => configFile(file) || onlyCodeFile(file);

  const filesOfInterest = filePaths.filter(configOrCodeFile);
  const pathsOfInterest = [];

  for (const changedFile of changedFiles) {
    const { filename } = changedFile.filename;

    core.info(`checking file '${filename}'`);

    if (configOrCodeFile(filename)){
      pathsOfInterest.push(filename);
    }
  }

  core.info(filesOfInterest);

  for (let i = 0; i < filesOfInterest.length; i++) {
    const fullPathWithFile = filesOfInterest[i];
    const partsOfPath = fullPathWithFile.split('/');

    partsOfPath.pop();

    const fullPath = partsOfPath.join('/');

    pathsOfInterest.push(fullPath);
  }

  core.info(pathsOfInterest);

  const pathsThatHaveChanges = new Set(pathsOfInterest);

  const functionsAndSettingsToUpdate = [];

  core.info('listChangedFunctionsAndSettings3');

  pathsThatHaveChanges.forEach(pathThatHaveChanges => {

    core.info('pathsThatHaveChanges.forEach');

    var codeFileName = null;
    var configFileName = null;

    const defineAsConfigOrCode = file => {
      if (onlyCodeFile(file)) {
        codeFileName = file;

        return;
      }

      if (configFile(file)) {
        configFileName = file;
      };
    }

    fs.readdirSync(pathThatHaveChanges).forEach(defineAsConfigOrCode);

    const buildPath = fileName => pathThatHaveChanges + '/' + fileName;

    functionsAndSettingsToUpdate.push(
      {
        functionPath: buildPath(codeFileName),
        settingPath: buildPath(configFileName),
      }
    )
  });

  core.info('listChangedFunctionsAndSettings4');

  return functionsAndSettingsToUpdate;
};

/**
 * This function extracts the source code from a function to be sent to Segment.
 *
 * @param {String} functionPath The path of the function.
 * @returns {String} The source code of the function present at the given path.
 */
const extractCode = (functionPath) => fs.readFileSync(functionPath, 'utf8');

/**
 * This function reads the content of a yaml file and prepare a object with all alike its structure.
 *
 * @param {String} settingsPath The path of the yaml file to be read and converted.
 * @returns {Object} An object containg all configuration info inside the yaml file.
 */
var prepareSettings = (settingsPath) => {
  const fileData = fs.readFileSync(settingsPath, 'utf8')
  const doc = yaml.load(fileData);

  if (!doc.functionID) throw new Error('missing functionID');

  if (doc.settings) {
    doc.settings.forEach(setting => {
      if (!setting.name) throw new Error('settings present but missing name')
      if (!setting.label) throw new Error('settings present but missing label')
      if (!setting.description) throw new Error('settings present but missing description')
      if (!setting.required) throw new Error('settings present but missing required')
      if (!setting.sensitive) throw new Error('settings present but missing sensitive')
      if (!setting.type) throw new Error('settings present but missing type')
    });
  };

  return doc;
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

  core.info(`status: ${status}`);

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
 * @param {String} functionPath The path of the function that will be updated.
 * @param {String} settingsPath  The path of the yaml file that contains the configurations of the function.
 * @returns {Promise<void>} A promise that resolves when the function was successfully updated on Segment.
 */
const updateSegmentFunction = async (token, functionPath, settingsPath) => {
  const code = extractCode(functionPath);
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
  core.info('updateSegmentFunctions');

  const token = authToken();

  core.info(token);

  const functionsAndSettings = await listChangedFunctionsAndSettings();

  core.info('functionsAndSettings');
  core.info(functionsAndSettings);
  core.info('functionsAndSettings');

  for (let i = 0; i < functionsAndSettings.length; i++) {
    const functionAndSetting = functionsAndSettings[i];

    core.info(functionsAndSettings);

    await updateSegmentFunction(
      token,
      functionAndSetting.functionPath,
      functionAndSetting.settingPath,
    )
  };
};

try {
  updateSegmentFunctions();
} catch (error) {
  core.setFailed(error.message);
};