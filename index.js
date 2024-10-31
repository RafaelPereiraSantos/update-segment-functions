const core = require('@actions/core');
const exec = require('@actions/exec');

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
  const sourceBranch = process.env.GITHUB_REF_NAME;
  const currentBranch = process.env.GITHUB_BASE_REF;

  let myOutput = '';
  let myError = '';

  const options = {
    listeners : {
      stdout: data => { myOutput += data.toString() },
      stderr: data => { myError += data.toString() },
    },
  };

  await exec.exec(`git diff --name-only ${sourceBranch} ${currentBranch}`, [], options);
  const filePaths = myOutput.split('\n');

  if (!myError) throw new Error('cannot list diff files');
  if (!filePaths) return [];

  const configFile = file => /.yaml$|.YAML$|.yml$/i.test(file);
  const codeFile = file => /.js$/i.test(file);
  const testFile = file => /.test.js/i.test(file);
  const onlyCodeFile = file => codeFile(file) && !testFile(file);
  const configOrCodeFile = file => configFile(file) || onlyCodeFile(file);

  const filesOfInterest = filePaths.filter(configOrCodeFile);
  const pathsOfInterest = [];

  for (let i = 0; i < filesOfInterest.length; i++) {
    const fullPathWithFile = filesOfInterest[i];
    const partsOfPath = fullPathWithFile.split('/');

    partsOfPath.pop();

    const fullPath = partsOfPath.join('/');

    pathsOfInterest.push(fullPath);
  }

  const pathsThatHaveChanges = new Set(pathsOfInterest);

  const functionsAndSettingsToUpdate = [];

  pathsThatHaveChanges.forEach(pathThatHaveChanges => {
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

  if (!doc.displayName) throw new Error('missing displayName');
  if (!doc.resourceType) throw new Error('missing resourceType');

  if (!doc.settings) {
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
 * This function checks if the response returned by Segment was OK and the function was properly updated.
 *
 * @param {Response} response The response from Segment request.
 */
const handleResponse = (response) => {
  if (!response.status === 200) throw new Error(`function was not updated. status code: [${response.status}]`);
};

const updateSegmentFunction = async (token, functionPath, functionPath) => {
  const code = extractCode(functionPath);
  const settings = prepareSettings(functionPath);

  const method = 'POST';
  const headers = {
    'Authorization': `Beader ${token}`,
    'Content-Type': contentType,
  };
  const body = {
    code,
    settings,
  };

  const options = {
    method,
    headers,
    body
  };

  const response = await fetch(segmentFunctionsURL, options);

  handleResponse(response);
};

/**
 * This function checks all functions within the repository that had undergone changes in either the code or the
 * configurations to update them later on Segment with the new code and/or configurations.
 */
const updateSegmentFunctions = async () => {
  const token = authToken();
  const functionsAndSettings = listChangedFunctionsAndSettings();

  for (let i = 0; i < functionsAndSettings.length; i++) {
    const functionAndSetting = functionsAndSettings[i];

    await updateSegmentFunction(
      token,
      functionAndSetting.functionPath,
      functionAndSetting.settingPath,
    )
  }
};

try {
  await updateSegmentFunctions();
} catch (error) {
  core.setFailed(error.message);
}