@echo off
cd /d "%~dp0"
echo ============================
echo Deploying Firebase Project...
echo ============================
firebase deploy --only functions
pause
