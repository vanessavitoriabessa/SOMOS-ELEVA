@echo off
cd /d "%~dp0"
title Instalando SOMOS ELEVA V9
call npm install
if errorlevel 1 pause
pause
