import os

from update_segment_functions.utils import (
    read_config_file,
    read_raw_string_file,
    validate_function_settings,
)

from update_segment_functions.segment import (
    update_segment_function,
    validate_settings_payload,
)


def main():
    config_file_path = os.environ.get('CONFIGURATION_FILE_PATH') or 'config.yaml'
    segment_auth_token = os.environ.get('SEGMENT_TOKEN') or ''
    repository_path = os.environ.get('GITHUB_WORKSPACE') or ''

    if not segment_auth_token:
        raise SystemExit("Error: SEGMENT_TOKEN is not set")
    if not repository_path:
        raise SystemExit("Error: GITHUB_WORKSPACE is not set")

    print(f"Repository path: {repository_path}")
    print(f"Config file: {config_file_path}")

    configs = read_config_file(f"{repository_path}/{config_file_path}")

    if not configs or not configs.get('functions'):
        raise SystemExit(f"Error: no functions found in config file '{config_file_path}'")

    failed = []

    for function in configs.get('functions', []):
        try:
            validate_function_settings(function)
        except ValueError as e:
            print(f"Skipping function due to validation error: {e}")
            continue

        function_name = function.get('name')
        function_code_path = function.get('code_path', '')
        function_settings_path = function.get('settings_path', '')

        full_settings_path = os.path.join(repository_path, function_settings_path)
        settings_data = read_config_file(full_settings_path)
        function_id = settings_data.get('function_id')
        if not function_id:
            print(f"Error: missing 'function_id' in settings file: {full_settings_path}")
            failed.append(function_name)
            continue

        code = read_raw_string_file(os.path.join(repository_path, function_code_path))
        if not code.strip():
            print(f"Skipping function '{function_name}' because code is empty")
            continue

        settings = settings_data.get('settings', [])

        print(f"Updating function '{function_name}' (id: {function_id})...")

        try:
            validate_settings_payload(settings)
            update_segment_function(function_id, segment_auth_token, code, settings)
            print(f"Successfully updated function: '{function_name}'")
        except Exception as e:
            print(f"Error updating function '{function_name}': {e}")
            failed.append(function_name)

    if failed:
        raise SystemExit(f"The following functions failed to update: {', '.join(failed)}")


if __name__ == "__main__":
    main()
