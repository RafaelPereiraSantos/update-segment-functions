# update-segment-functions
This repository holds a github actions developed to sync functions within the repository with Segment.

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

## Inputs

### `authorization-token`

**Required** The authorization token used to access Segment public APIs of your account. Default `""`.

## Outputs

### `time`

The time we greeted you.

## Example usage

```yaml
uses: actions/update-segment-functions@v1
with:
  authorization-token: my-secret-token
```