@echo off
REM Launcher script to start VS Code with proper Python environment

echo Starting VS Code with Python environment...
echo.

REM Set up environment variables
set PYTHONPATH=%PYTHONPATH%;%~dp0

REM Open VS Code
start "" "code" "%~dp0"

echo.
echo VS Code launched.
echo.
echo IMPORTANT:
echo - When selecting a Python interpreter, choose the one in your /venv/Scripts/python.exe
echo - If you still see import warnings, open the Command Palette (Ctrl+Shift+P)
echo   and use "Developer: Reload Window" to refresh VS Code
echo.
echo Happy coding!