import os

from src.github_actions_utils import (
    get_changed_files,
)

from src.utils import (
    read_config_file,
    read_raw_string_file,
    validate_function_settings,
)

from src.segment import (
    update_segment_function,
    validate_settings_payload
)

config_file_path = os.environ.get('INPUT_CONFIGURATION-FILE-PATH') or 'config.yaml'
segment_auth_token = os.environ.get('INPUT_SEGMENT-TOKEN') or ''
trunk_branch = os.environ.get('INPUT_TRUNK-BRANCH') or ''
repository_path = os.environ.get('GITHUB_WORKSPACE') or ''

def main():
    print("starting main script...")
    all_changed_files = get_changed_files(base_branch=trunk_branch)
    print(all_changed_files)
    configs = read_config_file(f"{repository_path}/{config_file_path}")

    functions_or_settings_to_update = []
    print(configs)
    for function in configs.get('functions', []):
        print(function)
        validate_function_settings(function)
        function_code_path = function.get('code_path', '')
        function_settings_path = function.get('settings_path', '')

        print(function_code_path)
        print(function_settings_path)

        if function_code_path in all_changed_files or function_settings_path in all_changed_files:
            functions_or_settings_to_update.append({
                'function_id': function.get('function_id'),
                'name': function.get('name'),
                'code': read_raw_string_file(function_code_path),
                'settings': read_config_file(function_settings_path)
            })

    print("list of functions or settings to update:")
    print(functions_or_settings_to_update)

    for function in functions_or_settings_to_update:
        validate_settings_payload(function['settings'])
        update_segment_function(
            function['function_id'],
            segment_auth_token,
            function['code'],
            function['settings']
        )

if __name__ == "__main__":
    main()