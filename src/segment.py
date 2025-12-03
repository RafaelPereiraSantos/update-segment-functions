import requests

segment_url = 'https://api.segmentapis.com'
functions_endpoint = '/functions'

mandatory_settings_keys = ['name', 'label', 'description', 'type', 'required', 'sensitive']

def update_segment_function(function_id: str, token: str, code: str, settings: dict = {}) -> requests.Response:
    url = f'{segment_url}{functions_endpoint}/{function_id}'

    data = {'code': code, 'settings': settings}

    response = requests.patch(url, headers=default_headers(token), json=data)
    return response


def default_headers(token: str) -> dict:
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

def validate_settings_payload(body: dict):
    if not body:
        raise ValueError(f"Missing settings")
    for mandatory in mandatory_settings_keys:
        if mandatory not in body:
            raise ValueError(f"Missing mandatory setting key: {mandatory}")
        if body[mandatory] is None:
            raise ValueError(f"Setting key '{mandatory}' cannot be None")