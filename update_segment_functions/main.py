import os

from update_segment_functions.github_actions_utils import (
    get_changed_files,
)

from update_segment_functions.utils import (
    read_config_file,
    read_raw_string_file,
    validate_function_settings,
)

from update_segment_functions.segment import (
    update_segment_function,
    validate_settings_payload
)

def main():
    config_file_path = os.environ.get('CONFIGURATION_FILE_PATH') or 'config.yaml'
    segment_auth_token = os.environ.get('SEGMENT_TOKEN') or ''
    trunk_branch = os.environ.get('TRUNK_BRANCH') or 'master'
    repository_path = os.environ.get('GITHUB_WORKSPACE') or ''

    if not segment_auth_token:
        raise SystemExit("Error: SEGMENT_TOKEN is not set")
    if not repository_path:
        raise SystemExit("Error: GITHUB_WORKSPACE is not set")

    print("starting main script...")
    print(f"Repository path: {repository_path}")
    print(f"Config file: {config_file_path}")
    print(f"Trunk branch: {trunk_branch}")

    try:
        all_changed_files = get_changed_files(repository_path, base_branch=trunk_branch)
        configs = read_config_file(f"{repository_path}/{config_file_path}")
    except Exception as e:
        raise SystemExit(f"Error reading configuration: {e}")

    print(f"Changed files detected by git diff ({len(all_changed_files)}):")
    for f in all_changed_files:
        print(f"  - {f}")

    functions_or_settings_to_update = []

    for function in configs.get('functions', []):
        try:
            validate_function_settings(function)
        except ValueError as e:
            print(f"Skipping function due to validation error: {e}")
            continue

        function_code_path = function.get('code_path', '')
        function_settings_path = function.get('settings_path', '')

        print(f"Checking function '{function.get('name')}': code_path='{function_code_path}' settings_path='{function_settings_path}'")

        if function_code_path in all_changed_files or function_settings_path in all_changed_files:
            print(f"Changes detected in function: {function.get('name')}")

            try:
                full_settings_path = os.path.join(repository_path, function_settings_path)
                settings_data = read_config_file(full_settings_path)

                if not settings_data or 'function_id' not in settings_data:
                    print(f"Error: Missing 'function_id' in settings file: {full_settings_path}")
                    continue

                functions_or_settings_to_update.append({
                    'function_id': settings_data['function_id'],
                    'name': function.get('name'),
                    'code': read_raw_string_file(os.path.join(repository_path, function_code_path)),
                    'settings': settings_data.get('settings', [])
                })
            except Exception as e:
                raise SystemExit(f"Error reading function files for {function.get('name')}: {e}")

    print("list of functions to update:")
    for function in functions_or_settings_to_update:
        print(f"  - {function['name']} (id: {function['function_id']})")

    failed = []
    for function in functions_or_settings_to_update:
        try:
            validate_settings_payload(function['settings'])
            update_segment_function(
                function['function_id'],
                segment_auth_token,
                function['code'],
                function['settings']
            )
            print(f"Successfully updated function: {function['name']}")
        except Exception as e:
            print(f"Error updating function {function['name']} ({function['function_id']}): {e}")
            failed.append(function['name'])

    if failed:
        raise SystemExit(f"The following functions failed to update: {', '.join(failed)}")

if __name__ == "__main__":
    main()