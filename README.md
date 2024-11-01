# update-segment-functions
This repository holds a github actions developed to sync functions within the repository with Segment.

Each function must be in a separated folder that contains the function code in a javascript file and a configuration
file in a yaml formatted file.

The function must exist on Segment previously, this action only updates an existing function, it does not create one
from the scratch, the code and settings can be managed by this action but not the creation of the function itself.

The yaml file should be composed by the following settings:
- functionID: (optional) The ID of a function previously created on Segment.
- displayName: (optional)
- logoUrl: (optional)
- resourceType: (required) ex: DESTINATION INSERT_DESTINATION SOURCE
- description: (optional)
- settings: (optional) A list of parameters that will be inject into the function.

If the `settings` is present, it must be a list and all the fields below are required inside each item of the list:
- name
- label
- description
- required
- sensitive
- type

Please refers to the `my_function_settings.yaml`inside the example_function folder for a full example of the settings file.

## Inputs

### `authorization-token`

**Required** The authorization token used to access Segment public APIs of your account. Default `""`.

## Example usage

```yaml
uses: RafaelPereiraSantos/update-segment-functions@v1.5.1
with:
  authorization-token: my-secret-token
```