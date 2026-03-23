@echo off
echo ===============================================
echo YTECH Application - Demarrage des Serveurs
echo ===============================================
echo.

echo [1/3] Verification des ports...
netstat -ano | findstr :5001 >nul
if %errorlevel% == 0 (
    echo [INFO] Port 5001 deja utilise - Arret du processus...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001') do taskkill /PID %%a /F >nul 2>&1
)

netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo [INFO] Port 3000 deja utilise - Arret du processus...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F >nul 2>&1
)

echo [2/3] Demarrage du Backend (Port 5001)...
cd backend
start "YTECH Backend" cmd /k "npm start"
timeout /t 5 /nobreak >nul

echo [3/3] Demarrage du Frontend (Port 3000)...
cd ../frontend
start "YTECH Frontend" cmd /k "npm start"

echo.
echo ===============================================
echo SERVEURS DEMARRES AVEC SUCCES !
echo ===============================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5001
echo Health Check: http://localhost:5001/api/health
echo ===============================================
echo.
echo Appuyez sur une touche pour ouvrir le navigateur...
pause >nul

echo Ouverture de l'application...
start http://localhost:3000

echo.
echo Pour arreter les serveurs, fermez simplement les fenetres.
pause
