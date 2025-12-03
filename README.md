# update-segment-functions
This repository holds a github actions that updates functions in Segment from your repository.

This action list the available functions within your repository and checks which ones have been changed in your in your
current branch against your trunk branch.

For any function settings or actual code that had changed, the action will merge the settings of that function with the
code and send a request to Segment to update the function.

This actions does not create the function for you, you must create one manually in Segment them feed your functino
settings with the function ID of the function you want to have in your repository.

## How to use it

1. Import this function to your deployment pipeline, it is recommended to add a trigger to this function based on
a command that you can call by typing a specifc key word combination in a comment such as ```/action Deploy segment
functions```.

ex:
```
  TODO
```

2. Add a file to your repository called ```segment_functions_configs.yaml``` OR define a custom action input called:
```config_path``` in your action pipeline description where you are importing this action. The action will use either
the default value or the value you passed in the ```config_path```to identify the main configuration file for all your
functions. Read more about what is inside this file in more details in the sectoin ```Config file specifications```.

### Config file specifications

Your main configution file must look like the following:
```yaml
functions:
  - name: sample function
    -- the path of the code of your function.
    code_path: example/sample_function/index.js
     -- the path of the settings of your function.
    settings_path: example/sample_function/function_settings.yaml
```

- ***functions***: Is a list contanining the relation between of name, code path and settings path of each of your functions, it is up to you how you want to organize your repository.
- ***name***: Is the name of each of your functions, up to you.
- ***code_path***: Is the path of the code of your function within your repository.
- ***settings_path***: Is the path of the settings associated with the code of your function.

Each settings file of every functino must look like this:
```yaml
function_id: sample_function_id
code_path: example/sample_function.py
settings:
  - name: sample variable
    label: variable_label
    description: This is a sample variable for demonstration.
    type: string
    required: false
    sensitive: false
description: A sample function for demonstration purposes.
```

- ***function_id***: Is the ID of your function provided by Segment itself.
- ***settings***: Is a mapping containing the mandatory fields of each parameter that you function uses.
- ***name***: Is the the name of the parameter.
- ***label***: Is the label of the parameter, follow Segment standards.
- ***description***: Is the description of your parameter.
- ***type***: Is the type of your parameter inside Segment. (String, Boolean, Map, Array)
- ***required***: Defines whether or not this parameter is mandatory for your function.
- ***sensitive***: Defines if the parameter is senstive, which means that once you define it nobody can read it again
only overwrite it.