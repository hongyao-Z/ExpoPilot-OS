@echo off
chcp 65001 >nul
echo Deploying 场脉龙虾 files...

copy /y "D:\code\expopilot-demo\docs\lobster-optimization\SOUL.md"      "D:\浪前OBS思考\龙虾工作区\SOUL.md"
if %errorlevel% equ 0 (echo [OK] SOUL.md) else (echo [FAIL] SOUL.md)

copy /y "D:\code\expopilot-demo\docs\lobster-optimization\MEMORY.md"    "D:\浪前OBS思考\龙虾工作区\MEMORY.md"
if %errorlevel% equ 0 (echo [OK] MEMORY.md) else (echo [FAIL] MEMORY.md)

copy /y "D:\code\expopilot-demo\docs\lobster-optimization\SKILLS.md"    "D:\浪前OBS思考\龙虾工作区\SKILLS.md"
if %errorlevel% equ 0 (echo [OK] SKILLS.md) else (echo [FAIL] SKILLS.md)

copy /y "D:\code\expopilot-demo\docs\lobster-optimization\USER.md"      "D:\浪前OBS思考\龙虾工作区\USER.md"
if %errorlevel% equ 0 (echo [OK] USER.md) else (echo [FAIL] USER.md)

copy /y "D:\code\expopilot-demo\docs\lobster-optimization\OpenClawData-SOUL.md" "D:\OpenClawData\SOUL.md"
if %errorlevel% equ 0 (echo [OK] OpenClawData-SOUL.md) else (echo [FAIL] OpenClawData-SOUL.md)

echo.
echo Done. Restart OpenClaw to take effect.
pause
