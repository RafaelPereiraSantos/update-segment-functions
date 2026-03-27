import os
import subprocess
from typing import List

def get_changed_files(repository_path: str, base_branch: str = 'master') -> List[str]:
    print(f"[git] repository_path: {repository_path}")
    print(f"[git] base_branch: {base_branch}")

    # Print current HEAD and branch state
    head_result = subprocess.run(
        ["git", "log", "--oneline", "-3"],
        cwd=repository_path,
        capture_output=True,
        text=True
    )
    print(f"[git] recent commits:\n{head_result.stdout.strip()}")

    branch_result = subprocess.run(
        ["git", "branch", "-a"],
        cwd=repository_path,
        capture_output=True,
        text=True
    )
    print(f"[git] branches:\n{branch_result.stdout.strip()}")

    fetch_result = subprocess.run(
        ["git", "fetch", "origin", base_branch],
        cwd=repository_path,
        check=False,
        capture_output=True,
        text=True
    )
    if fetch_result.returncode != 0:
        print(f"[git] Warning: git fetch failed: {fetch_result.stderr.strip()}")
    else:
        print(f"[git] fetch succeeded")

    diff_ref = f"origin/{base_branch}...HEAD"
    print(f"[git] running: git diff --name-only {diff_ref}")

    result = subprocess.run(
        ["git", "diff", "--name-only", diff_ref],
        cwd=repository_path,
        check=True,
        capture_output=True,
        text=True
    )

    print(f"[git] raw diff output:\n'{result.stdout}'")

    changed_files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
    return changed_files
