from unittest.mock import patch
from update_segment_functions.main import main

@patch('update_segment_functions.main.get_changed_files')
@patch('update_segment_functions.main.read_config_file')
@patch('update_segment_functions.main.read_raw_string_file')
@patch('update_segment_functions.main.update_segment_function')
@patch('update_segment_functions.main.validate_settings_payload')
@patch('os.environ.get')
def test_main_updates_changed_function(mock_env, mock_validate_payload, mock_update, mock_read_raw, mock_read_config, mock_changed_files):
    def env_get(key, default=''):
        env = {
            'INPUT_CONFIGURATION_FILE_PATH': 'config.yaml',
            'INPUT_SEGMENT_TOKEN': 'fake-token',
            'INPUT_TRUNK_BRANCH': 'main',
            'GITHUB_WORKSPACE': '/fake/repo'
        }
        return env.get(key, default)
    mock_env.side_effect = env_get

    mock_changed_files.return_value = ['src/index.js']

    mock_read_config.side_effect = [
        {'functions': [
            {
                'name': 'test-function',
                'code_path': 'src/index.js',
                'settings_path': 'src/settings.yaml'
            }
        ]},
        {
            'function_id': 'id-123',
            'settings': [{'name': 'var1', 'label': 'Var 1', 'description': 'desc', 'type': 'string', 'required': False, 'sensitive': False}]
        }
    ]

    mock_read_raw.return_value = "console.log('hello');"

    main()

    mock_update.assert_called_once_with(
        'id-123',
        'fake-token',
        "console.log('hello');",
        [{'name': 'var1', 'label': 'Var 1', 'description': 'desc', 'type': 'string', 'required': False, 'sensitive': False}]
    )

@patch('update_segment_functions.main.get_changed_files')
@patch('update_segment_functions.main.read_config_file')
@patch('update_segment_functions.main.update_segment_function')
@patch('os.environ.get')
def test_main_no_changes(mock_env, mock_update, mock_read_config, mock_changed_files):
    mock_env.return_value = '/fake/repo'

    mock_changed_files.return_value = ['other_file.txt']

    mock_read_config.return_value = {
        'functions': [
            {
                'name': 'test-function',
                'code_path': 'src/index.js',
                'settings_path': 'src/settings.yaml'
            }
        ]
    }

    main()

    mock_update.assert_not_called()
