@echo off
echo ================================
echo   🚀 REMORA SYSTEM DEPLOYMENT
echo ================================
echo.

REM Check if we're in a git repository
if not exist ".git" (
    echo ❌ Error: Not in a git repository
    echo Please run this from the project root directory
    pause
    exit /b 1
)

REM Get commit message from user or use default
set "commit_msg=Update system deployment"
if not "%~1"=="" set "commit_msg=%~1"

echo 📝 Commit message: %commit_msg%
echo.

REM Add all changes
echo 📦 Adding all changes...
git add .
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to add changes
    pause
    exit /b 1
)

REM Check if there are changes to commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo ℹ️  No changes to commit
    echo.
    echo 🔍 Checking remote status...
    git fetch
    git status
    pause
    exit /b 0
)

REM Commit changes
echo 💾 Committing changes...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to commit changes
    pause
    exit /b 1
)

REM Push to remote
echo 🌐 Pushing to remote repository...
git push
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to push to remote
    echo.
    echo 🔧 Trying to set upstream...
    git push --set-upstream origin main
    if %errorlevel% neq 0 (
        echo ❌ Error: Failed to push with upstream
        pause
        exit /b 1
    )
)

echo.
echo ✅ Successfully deployed!
echo 🎉 Your Remora system has been updated
echo.
echo 📋 Summary:
echo    - Added all changes
echo    - Committed: "%commit_msg%"
echo    - Pushed to remote repository
echo.
echo 🌍 Your deployed system should update automatically
echo.
pause