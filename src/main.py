import os

from src.github_actions_utils import (
    get_changed_files,
)

from src.utils import (
    read_config_file,
    read_raw_string_file,
)

from src.segment import (
    update_segment_function,
    validate_settings_payload
)

config_file_path = 'config.yaml'
segment_auth_token = os.environ.get('SEGMENT_AUTH_TOKEN')

def main():
    all_changed_files = get_changed_files()
    configs = read_config_file(config_file_path)

    functions_or_settings_to_update = []

    for function in configs.get('functions', []):
        function_code_path = function.get('code_path', '')
        function_settings_path = function.get('settings_path', '')

        if function_code_path in all_changed_files or function_settings_path in all_changed_files:
            functions_or_settings_to_update.append({
                'function_id': function.get('function_id', ''),
                'name': function.get('name', ''),
                'code': read_raw_string_file(function_code_path),
                'settings': read_config_file(function_settings_path)
            })

    for function in functions_or_settings_to_update:
        try:
            validate_settings_payload(function['settings'])
            update_segment_function(
                function['function_id'],
                segment_auth_token or '',
                function['code'],
                function['settings']
            )
        except Exception as e:
                print(f"Error processing function {function.get('name', 'unknown')}: {e}")