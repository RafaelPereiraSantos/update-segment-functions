import os
import subprocess
from typing import List

def get_changed_files(base_branch: str = 'main') -> List[str]:
    is_ci = os.getenv('CI') == 'true'

    if not is_ci:
        subprocess.run(["git", "fetch", "origin", base_branch], check=True, capture_output=True)

    result = subprocess.run(
        ["git", "diff", "--name-only", f"origin/{base_branch}...HEAD"],
        check=True,
        capture_output=True,
        text=True
    )

    changed_files = [f.strip() for f in result.stdout.split('\n') if f.strip()]

    return changed_files