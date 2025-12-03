import yaml

mandatory_function_keys = ['function_id', 'name', 'code_path', 'settings_path']

def read_config_file(config_path: str) -> dict:
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except Exception as e:
        print(f"Error reading config file {config_path}: {e}")
        return {}

def read_raw_string_file(file_path: str) -> str:
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        return content
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return ""

def filter_non_js_files(file_list: list) -> list:
    filtered_files = []
    for f in file_list:
        if f.endswith('.js'):
            filtered_files.append(f)
    return filtered_files

def validate_function_settings(settings: dict):
    for key in mandatory_function_keys:
        if key not in settings:
            raise ValueError(f"Missing mandatory function key: {key}")
        if settings[key] is None or settings[key] == '':
            raise ValueError(f"Function key '{key}' cannot be empty")