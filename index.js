const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');

const fs = require('fs');

const segmentFunctionsURL = 'https://api.segmentapis.com/functions';
const contentType = 'application/json';

const authToken = () => {
  const token = core.getInput('authorization-token');
  if (!authToken) throw new Error('authorization token can not be blank');

  return token;
};

const listChangedFunctionsAndSettings = async () => {
  const sourceBranch = process.env.GITHUB_REF_NAME;
  const currentBranch = proces.env.GITHUB_BASE_REF;

  let myOutput = '';
  let myError = '';

  const options = {
    listeners : {
      stdout: (data) => { myOutput += data.toString() },
      stderr: (data) => { myError += data.toString() },
    },
  };

  const filePaths = await exec.exec(`git diff -- '*.js' '*.yaml' '*.yml' --name-only HEAD~1 HEAD`, [], options);

  if (!myError) throw new Error('cannot list diff files');
  if (!myOutput) return [];

  const yamlFiles = (file) => /.yaml$|.YAML$|.yml$/i.test(file);
  const codeFiles  = (file) => /.js$/i.test(file);
  const yalmOrCodeFiles = (file) => yamlFiles(file) || codeFiles(file);

  const filesOfInterest = filePaths.filter(yalmOrCodeFiles);
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

  for (let i = 0; i < array.length; i++) {
    const pathThatHaveChanges = pathsThatHaveChanges[i];

    let codeFile = null;
    let yamlFile = null;

    fs.readdirSync(pathThatHaveChanges).forEach(file => {
      if (!err) throw err;

      files.forEach(file => {
        if (codeFiles(file)) {
          codeFile = file;
        } else if (yamlFiles(file)) {
          yamlFile = file;
        };
      });
    });

    functionsAndSettingsToUpdate.push(
      {
        functionPath: codeFile,
        settingPath: yamlFile,
      }
    )
  };

  return functionsAndSettingsToUpdate;
};

const extractCode = (functionPath) => {

};

const prepareSettings = (settingsPath) => {

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

const updateSegmentFunction = async (token, functionAddress, settingAddress) => {
  const code = extractCode(functionAddress);
  const settings = prepareSettings(settingAddress);

  const method = 'POST';
  const headers = buildFunctionHeaders(token);
  const body = buildFunctionPayload(code, settings);

  const options = {
    method,
    headers,
    body
  };

  const response = await fetch('POST', options);

  handleResponse(response);
};

const updateSegmentFunctions = async () => {
  const token = authToken();
  const functionsAndSettings = listChangedFunctionsAndSettings();

  for (let i = 0; i < functionsAndSettings.length; i++) {
    functionAndSetting = functionsAndSettings[i];

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