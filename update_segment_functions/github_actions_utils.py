import os
import subprocess
from typing import List

def get_changed_files(repository_path: str, base_branch: str = 'main') -> List[str]:
    is_ci = os.getenv('CI') == 'true'

    try:
        check = not is_ci
        subprocess.run(["git", "fetch", "origin", base_branch], cwd=repository_path, check=check, capture_output=True)

        result = subprocess.run(
            ["git", "diff", "--name-only", f"origin/{base_branch}...HEAD"],
            cwd=repository_path,
            check=True,
            capture_output=True,
            text=True
        )

        changed_files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
        return changed_files
    except subprocess.CalledProcessError as e:
        print(f"Error running git diff: {e.stderr}")
        try:
            result = subprocess.run(
                ["git", "diff", "--name-only", f"origin/{base_branch}"],
                cwd=repository_path,
                check=True,
                capture_output=True,
                text=True
            )
            return [f.strip() for f in result.stdout.split('\n') if f.strip()]
        except Exception as fallback_error:
            print(f"Fallback git diff also failed: {fallback_error}")
            return []