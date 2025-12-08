import requests
import certifi
import ssl
import os

segment_url = 'https://api.segmentapis.com'
functions_endpoint = '/functions'

mandatory_settings_keys = ['name', 'label', 'description', 'type', 'required', 'sensitive']

def get_session():
    """Create a requests session with proper SSL configuration"""
    session = requests.Session()
    # Try environment variable first, then certifi
    cert_path = os.environ.get('REQUESTS_CA_BUNDLE') or os.environ.get('SSL_CERT_FILE') or certifi.where()
    session.verify = cert_path
    return session

def update_segment_function(function_id: str, token: str, code: str, settings: dict = {}) -> requests.Response:
    url = f'{segment_url}{functions_endpoint}/{function_id}'

    data = {'code': code, 'settings': settings}

    session = get_session()
    response = session.patch(url, headers=default_headers(token), json=data)
    handle_segment_response(response)
    return response

def handle_segment_response(response: requests.Response):
    if response.status_code >= 200 and response.status_code < 300:
        print(f"Function updated successfully: {response.json()}")
    else:
        raise Exception(f"Error updating function: {response.status_code} - {response.text}")


def default_headers(token: str) -> dict:
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

def validate_settings_payload(body: dict):
    if not body:
        raise ValueError(f"Missing settings")
    for item in body:
        for mandatory in mandatory_settings_keys:
            if mandatory not in item:
                raise ValueError(f"Missing mandatory setting key: {mandatory}")
            if item[mandatory] is None:
                raise ValueError(f"Setting key '{mandatory}' cannot be None")