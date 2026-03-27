import pytest
from unittest.mock import patch, call
from update_segment_functions.main import main


def _base_env(overrides=None):
    env = {
        'SEGMENT_TOKEN': 'fake-token',
        'GITHUB_WORKSPACE': '/fake/repo',
        'CONFIGURATION_FILE_PATH': 'config.yaml',
    }
    if overrides:
        env.update(overrides)
    def get(key, default=''):
        return env.get(key, default)
    return get


@patch('update_segment_functions.main.update_segment_function')
@patch('update_segment_functions.main.validate_settings_payload')
@patch('update_segment_functions.main.read_raw_string_file')
@patch('update_segment_functions.main.read_config_file')
@patch('os.environ.get')
def test_main_updates_all_functions(mock_env, mock_read_config, mock_read_raw, mock_validate, mock_update):
    mock_env.side_effect = _base_env()

    mock_read_config.side_effect = [
        {'functions': [
            {'name': 'function-a', 'code_path': 'src/a.js', 'settings_path': 'src/a_settings.yaml'},
            {'name': 'function-b', 'code_path': 'src/b.js', 'settings_path': 'src/b_settings.yaml'},
        ]},
        {'function_id': 'id-aaa', 'settings': [
            {'name': 'var1', 'label': 'Var 1', 'description': 'desc', 'type': 'string', 'required': False, 'sensitive': False}
        ]},
        {'function_id': 'id-bbb', 'settings': []},
    ]
    mock_read_raw.side_effect = ["code-a", "code-b"]

    main()

    assert mock_update.call_count == 2
    mock_update.assert_any_call('id-aaa', 'fake-token', 'code-a', [
        {'name': 'var1', 'label': 'Var 1', 'description': 'desc', 'type': 'string', 'required': False, 'sensitive': False}
    ])
    mock_update.assert_any_call('id-bbb', 'fake-token', 'code-b', [])


@patch('update_segment_functions.main.update_segment_function')
@patch('update_segment_functions.main.read_raw_string_file')
@patch('update_segment_functions.main.read_config_file')
@patch('os.environ.get')
def test_main_continues_after_one_failure(mock_env, mock_read_config, mock_read_raw, mock_update):
    mock_env.side_effect = _base_env()

    mock_read_config.side_effect = [
        {'functions': [
            {'name': 'function-a', 'code_path': 'src/a.js', 'settings_path': 'src/a_settings.yaml'},
            {'name': 'function-b', 'code_path': 'src/b.js', 'settings_path': 'src/b_settings.yaml'},
        ]},
        {'function_id': 'id-aaa', 'settings': []},
        {'function_id': 'id-bbb', 'settings': []},
    ]
    mock_read_raw.side_effect = ["code-a", "code-b"]
    mock_update.side_effect = [Exception("API error"), None]

    with pytest.raises(SystemExit) as exc:
        main()

    assert 'function-a' in str(exc.value)
    assert mock_update.call_count == 2


@patch('update_segment_functions.main.read_config_file')
@patch('os.environ.get')
def test_main_skips_function_missing_function_id(mock_env, mock_read_config):
    mock_env.side_effect = _base_env()

    mock_read_config.side_effect = [
        {'functions': [
            {'name': 'function-a', 'code_path': 'src/a.js', 'settings_path': 'src/a_settings.yaml'},
        ]},
        {'settings': []},  # missing function_id
    ]

    with pytest.raises(SystemExit) as exc:
        main()

    assert 'function-a' in str(exc.value)


@patch('os.environ.get')
def test_main_missing_segment_token_exits(mock_env):
    mock_env.side_effect = _base_env({'SEGMENT_TOKEN': ''})

    with pytest.raises(SystemExit, match='SEGMENT_TOKEN'):
        main()


@patch('os.environ.get')
def test_main_missing_github_workspace_exits(mock_env):
    mock_env.side_effect = _base_env({'GITHUB_WORKSPACE': ''})

    with pytest.raises(SystemExit, match='GITHUB_WORKSPACE'):
        main()


@patch('update_segment_functions.main.read_config_file')
@patch('os.environ.get')
def test_main_empty_config_exits(mock_env, mock_read_config):
    mock_env.side_effect = _base_env()
    mock_read_config.return_value = {}

    with pytest.raises(SystemExit, match='no functions found'):
        main()
