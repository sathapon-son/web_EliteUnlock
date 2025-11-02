@echo off
cd /d "D:\Web\web_EliteUnlock\myshop"
echo ============================
echo Deploying Firebase Project...
echo ============================
firebase deploy --only hosting,functions
pause
