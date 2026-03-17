import pytest
import os
import yaml
from src.utils import read_config_file, read_raw_string_file, validate_function_settings

def test_read_config_file(tmp_path):
    d = tmp_path / "subdir"
    d.mkdir()
    p = d / "test.yaml"
    data = {'functions': [{'name': 'test'}]}
    p.write_text(yaml.dump(data))

    config = read_config_file(str(p))
    assert config == data

def test_read_config_file_not_found():
    config = read_config_file("non_existent.yaml")
    assert config == {}

def test_read_raw_string_file(tmp_path):
    p = tmp_path / "test.js"
    content = "console.log('hello');"
    p.write_text(content)

    assert read_raw_string_file(str(p)) == content

def test_validate_function_settings():
    valid_settings = {
        'name': 'test',
        'code_path': 'src/index.js',
        'settings_path': 'src/settings.yaml'
    }
    validate_function_settings(valid_settings)

def test_validate_function_settings_missing_key():
    invalid_settings = {
        'name': 'test',
        'code_path': 'src/index.js'
    }
    with pytest.raises(ValueError, match="Missing mandatory function key: settings_path"):
        validate_function_settings(invalid_settings)

def test_validate_function_settings_empty_value():
    invalid_settings = {
        'name': 'test',
        'code_path': 'src/index.js',
        'settings_path': ''
    }
    with pytest.raises(ValueError, match="Function key 'settings_path' cannot be empty"):
        validate_function_settings(invalid_settings)
