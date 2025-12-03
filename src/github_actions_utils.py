import os
import subprocess
from typing import List

default_trunk = 'master'

def get_changed_files() -> List[str]:
    try:
        base_ref = os.getenv('GITHUB_BASE_REF', default_trunk)
        head_ref = os.getenv('GITHUB_HEAD_REF', 'HEAD')

        # For pull requests in GitHub Actions
        if base_ref:
            cmd = ['git', 'diff', '--name-only', f'origin/{base_ref}...{head_ref}']
        else:
            # Fallback for non-PR events
            cmd = ['git', 'diff', '--name-only', 'origin/master...HEAD']

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )

        files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
        return files

    except subprocess.CalledProcessError as e:
        print(f"Error getting changed files: {e}")
        return []