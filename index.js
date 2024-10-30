const core = require('@actions/core');
const github = require('@actions/github');

const segmentFunctionsURL = 'https://api.segmentapis.com/functions';
const contentType = 'application/json';

const authToken = () => {
  const token = core.getInput('authorization-token');
  if (!authToken) throw new Error('authorization token can not be blank');

  return token;
};

const listChangedFunctionsAndSettings = () => {
  return [
    {
      functionPath: '',
      settingPath: '',
    }
  ]
};

const extractCode = () => {

};

const prepareSettings = () => {

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

const postRequest = (headers, payload) => {

};

const handleResponse = (response) => {
  if (!response.status === 200) throw new Error(`function was not updated status code: [${response.status}]`);
};

const updateSegmentFunction = async (token, functionAddress, settingAddress) => {
  const code = extractCode(functionAddress);
  const settings = prepareSettings(settingAddress);

  const headers = buildFunctionHeaders(token);
  const payload = buildFunctionPayload(code, settings);

  const response = await postRequest(headers, payload);

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