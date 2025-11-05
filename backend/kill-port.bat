@echo off
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo Stopping process with PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo Port 3000 should be free now.
pause

