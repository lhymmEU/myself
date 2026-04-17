@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul

echo.
echo ========================================
echo   Life Dashboard - Setup
echo ========================================
echo.

:: --- Check Node.js ---
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo.
  echo   Please install Node.js ^(v20 or later^) from:
  echo     https://nodejs.org/
  echo.
  echo   After installing, close this window, open a new one,
  echo   and run this script again.
  pause
  exit /b 1
)

:: Parse the major version number from node -v (e.g. "v22.0.0" -> "22")
for /f "usebackq tokens=*" %%i in (`node -e "process.stdout.write(process.version.split('.')[0].slice(1))"`) do set NODE_MAJOR=%%i

if not defined NODE_MAJOR (
  echo [ERROR] Could not determine Node.js version.
  echo   Please ensure Node.js is installed correctly.
  pause
  exit /b 1
)

if %NODE_MAJOR% LSS 20 (
  echo [ERROR] Node.js v20+ is required.
  for /f "usebackq tokens=*" %%v in (`node -v`) do echo   You have %%v installed.
  echo   Please update from: https://nodejs.org/
  pause
  exit /b 1
)

for /f "usebackq tokens=*" %%v in (`node -v`) do echo [OK] Node.js %%v detected

:: --- Check npm ---
where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] npm is not installed. It should come with Node.js.
  echo   Please reinstall Node.js from: https://nodejs.org/
  pause
  exit /b 1
)

for /f "usebackq tokens=*" %%v in (`npm -v`) do echo [OK] npm %%v detected
echo.

:: --- Clean stale build cache so module resolution starts from a known state ---
if exist .next (
  echo [INFO] Removing stale .next build cache...
  rmdir /s /q .next
)

:: --- Install dependencies ---
echo [1/2] Installing dependencies (this may take a minute)...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] npm install failed.
  echo.
  echo   If you see errors about "node-gyp" or "better-sqlite3":
  echo     1. Install Visual Studio Build Tools from:
  echo        https://visualstudio.microsoft.com/visual-cpp-build-tools/
  echo     2. During installation, select "Desktop development with C++"
  echo     3. Restart this terminal and run setup.bat again
  echo.
  echo   If running setup.bat fails repeatedly, try the PowerShell version:
  echo     powershell -ExecutionPolicy Bypass -File setup.ps1
  echo.
  echo   Alternatively, make sure you are using Node.js v20 or v22 LTS
  echo   which includes prebuilt native binaries.
  pause
  exit /b 1
)
echo.

:: Show the installed crypto library version so a regression is visible.
echo [INFO] Installed @noble/hashes version:
call npm ls @noble/hashes --depth=0 2>nul
echo.

:: --- Build the app ---
echo [2/2] Building the app...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Build failed. Please check the errors above.
  pause
  exit /b 1
)
echo.

echo ========================================
echo   Setup complete!
echo ========================================
echo.
echo   To start the dashboard, run:
echo.
echo     npm run dev
echo.
echo   Then open http://localhost:3000 in your browser.
echo.
echo   The database is created automatically on first launch.
echo.
pause
endlocal
