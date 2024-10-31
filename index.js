const core = require('@actions/core');
const exec = require('@actions/exec');

const fs = require('fs');
const yaml = require('js-yaml');

const segmentFunctionsURL = 'https://api.segmentapis.com/functions';
const contentType = 'application/json';

const authToken = () => {
  const token = core.getInput('authorization-token');
  if (!authToken) throw new Error('authorization token can not be blank');

  return token;
};

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
  const codeFile  = file => /.js$/i.test(file);
  const configOrCodeFile = file => configFile(file) || codeFile(file);

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
      if (codeFile(file)) {
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

const extractCode = (functionPath) => fs.readFileSync(functionPath, 'utf8');

var prepareSettings = (settingsPath) => {
  const fileData = fs.readFileSync(settingsPath, 'utf8')
  const doc = yaml.load(fileData);

  if (!doc.description) throw new Error('missing description');
  if (!doc.label) throw new Error('missing label');
  if (!doc.name) throw new Error('missing name');
  if (!doc.required) throw new Error('missing required');
  if (!doc.sensitive) throw new Error('missing sensitive');
  if (!doc.type) throw new Error('missing type');

  return doc
};

const buildFunctionHeaders = (token) => {
  return {
    'Authorization': `Beader ${token}`,
    'Content-Type': contentType,
  };
};

const buildFunctionPayload = (code, settings) => {
  return {
    code,
    settings,
  };
};

const handleResponse = (response) => {
  if (!response.status === 200) throw new Error(`function was not updated. status code: [${response.status}]`);
};

const updateSegmentFunction = async (token, functionPath, functionPath) => {
  const code = extractCode(functionPath);
  const settings = prepareSettings(functionPath);

  const method = 'POST';
  const headers = buildFunctionHeaders(token);
  const body = buildFunctionPayload(code, settings);

  const options = {
    method,
    headers,
    body
  };

  const response = await fetch(segmentFunctionsURL, options);

  handleResponse(response);
};

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