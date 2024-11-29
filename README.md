# update-segment-functions
This repository holds a github actions developed to sync functions within the repository that uses this action with
the platform of [Segment](https://segment.com/).

---

**Disclaimer**:
By no means I am directly involved with Segment, their team or any third party contractor, I developed and maintain this
github actions for the sole purpose of helping me out both on my professional and personal projects that are integrated
with Segment. You may and and I encourage you to use this action and help on maintaining it.

## how to use
Each function code must be in a separated folder that contains the function code in a javascript file and a
configuration file in a yaml formatted file.

There is no pattern for the name of neither the function nor the yaml file, you can choose whatever name you want, the
only requirement is that: there must be only one javascript and yaml file per folder.

The function must previously exist on Segment, this action only updates an existing function, it does not create one
from the scratch, the code and settings can be managed by this action but not the creation of the function itself.

### yaml file settings
The yaml file should be composed by the following settings:
- functionID: (optional) The ID of a function previously created on Segment.
- displayName: (optional)
- logoUrl: (optional)
- resourceType: (optional) ex: DESTINATION INSERT_DESTINATION SOURCE
- description: (optional)
- settings: (optional) A list of parameters that will be inject into the function.

If the `settings` sections is present, it must be a list and all the fields below are required inside each item of the
list:
- name
- label
- description
- required
- sensitive
- type

Please refers to the `my_function_settings.yaml`inside the example_function folder for a full example of the settings
file.

## Inputs

### `authorization-token`

**Required** The authorization token used to access Segment public APIs of your account. Default `""`.

## Example usage

```yaml
on:
  issue_comment:
    types: [created]
jobs:
  deploy-function:
    if: ${{ github.event.issue.pull_request }}  && github.event.comment.body == '{your command favorite command in here}'
    runs-on: ubuntu-latest
    steps:
      - name: Git checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: '0'
      - uses: RafaelPereiraSantos/update-segment-functions@{version}
        with:
          authorization-token: ${{ github.event.issue.number }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          pr-number: ${{ github.event.issue.number }}
```

**Note:** Avoid using plain text secret, please try to use github secrets manager:
[LINK](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

This action will run for every merge between two branches.

If you want that the action only runs when the merge is with your trunk branch (AKA master or main), you must add a
statement on the github action description to prevent this action from running on other branches with he following
clause:
```yaml
if: github.ref == 'refs/heads/master'
```