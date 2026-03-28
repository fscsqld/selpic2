@echo off
taskkill /F /IM node.exe 2>nul
if exist ".next" rmdir /s /q ".next"
start http://localhost:3000
npm run dev
