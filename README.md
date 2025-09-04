# update-segment-functions

This repository holds a github actions developed to sync functions within the repository that uses this action with
the platform of [Segment](https://segment.com/).

---

**Disclaimer**:
By no means I am directly involved with Segment, their team or any third party contractor, I developed and maintain this
github actions for the sole purpose of helping me out both on my professional and personal projects that are integrated
with Segment. You may and and I encourage you to use this action and help on maintaining it.

## how to use

The function must previously exist on Segment, this action only updates an existing function, it does not create one
from the scratch, the code and settings can be managed by this action but not the creation of the function itself.

### Function naming convention

Each function code must be in a separated folder that contains the function code in a javascript file and a
configuration file in a yaml formatted file.

There is no pattern for the name of neither the function nor the yaml file, you can choose whatever name you want, the
only requirement is that: there must be only one javascript and yaml file per folder, tests are OK as long as they have
the ``.test.`` in their naming.

### Command activiation

This function is executed based on a command being called in the commentary section of the pull request which contains
function code to be updated on Segment.

You can define what command you want to use it is all up to you, please referer to the section **Example usage** for an
example and more details.

## How to configure

Bellow you can see the details on how to implement and use this action.

### yaml file settings

Below are the configurations necessary for each function.
The yaml file should be composed by the following settings:

- functionID: (optional) The ID of a function previously created on Segment.
- displayName: (optional)
- loaaagoUrl: (optional)
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

#### `authorization-token`

**Required** The authorization token used to access Segment public APIs of your account. Default `""`.

#### `github-token`

**Required** The authorization token so the action can check and compare changes in the pull request. Default `""`.

#### `pr-number`

**Required** The number of the pull request so the action knows what to compare agains the trunk branch. Default `""`.

## Example usage

### Github action configuration

```yaml
on:
  issue_comment:
    types: [created]
jobs:
  deploy-function:
    if: ${{ github.event.issue.pull_request }}  && github.event.comment.body == '!update_functions'
    runs-on: ubuntu-latest
    steps:
      - name: Git checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: '0'
      - uses: RafaelPereiraSantos/update-segment-functions@{version}
        with:
          authorization-token: ${{ secrets.MY_AUTHORIZATION_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          pr-number: ${{ github.event.issue.number }}
```

**NOTES:**

- We are adding the condition `if: ${{ github.event.issue.pull_request }}  && github.event.comment.body == '!update_functions'`
  so, the action will be only activated if a comment is made in a pull request containing the body !update_functions. This
  is the way this action was intended to be used as a helper command in the pull request to ease the deploy and testing
  process.
- We are specifying the `github-token` with the variable ${{ secrets.GITHUB_TOKEN }}, this is pretty standard stuff,
  the action needs a valid github token to be able to read the pull request content.
- We are specifying the `pr-number` with the variable ${{ github.event.issue.number }} so the action knows what pull
  request is requesting the function update otherwise, the action won't be able to compare what changed from the master
  hence, the function code will not be updated.

## Tips

- Avoid using plain text secret, please try to use github secrets manager:
  [LINK](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
