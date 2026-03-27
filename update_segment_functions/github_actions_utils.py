import os
import subprocess
from typing import List

def get_changed_files(repository_path: str, base_branch: str = 'master') -> List[str]:
    fetch_result = subprocess.run(
        ["git", "fetch", "origin", base_branch],
        cwd=repository_path,
        check=False,
        capture_output=True,
        text=True
    )
    if fetch_result.returncode != 0:
        print(f"Warning: git fetch failed: {fetch_result.stderr.strip()}")

    result = subprocess.run(
        ["git", "diff", "--name-only", f"origin/{base_branch}...HEAD"],
        cwd=repository_path,
        check=True,
        capture_output=True,
        text=True
    )

    changed_files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
    return changed_files
