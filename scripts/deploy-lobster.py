#!/usr/bin/env python3
"""Deploy optimized lobster files to workspace directories."""
import shutil
import os

FILES = {
    "SOUL.md":           r"D:\浪前OBS思考\龙虾工作区\SOUL.md",
    "MEMORY.md":         r"D:\浪前OBS思考\龙虾工作区\MEMORY.md",
    "SKILLS.md":         r"D:\浪前OBS思考\龙虾工作区\SKILLS.md",
    "USER.md":           r"D:\浪前OBS思考\龙虾工作区\USER.md",
    "OpenClawData-SOUL.md": r"D:\OpenClawData\SOUL.md",
}

SRC = r"D:\code\expopilot-demo\docs\lobster-optimization"

for src_name, dst_path in FILES.items():
    src_path = os.path.join(SRC, src_name)
    if not os.path.exists(src_path):
        print(f"SKIP (missing): {src_path}")
        continue
    try:
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        shutil.copy(src_path, dst_path)
        print(f"OK  {src_name} -> {dst_path}")
    except PermissionError:
        print(f"FAIL (permission): {dst_path}")
    except Exception as e:
        print(f"FAIL ({type(e).__name__}): {dst_path} - {e}")

print("Done.")
