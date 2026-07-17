@echo off
cd /d "%~dp0"
title SOMOS ELEVA V9
start http://localhost:3001
call npm run dev
pause
