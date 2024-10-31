# update-segment-functions
This repository holds a github actions developed to sync functions within the repository with Segment.

Each function must be in a separated folder that contains the function code in a javascript file and a configuration
file in a yaml formatted file.

Inside the yaml file there must be the following fields:
 - description
 - label
 - name
 - required
 - sensitive
 - type

## Inputs

### `authorization-token`

**Required** The authorization token used to access Segment public APIs of your account. Default `""`.

## Example usage

```yaml
uses: RafaelPereiraSantos/update-segment-functions@v1
with:
  authorization-token: my-secret-token
```