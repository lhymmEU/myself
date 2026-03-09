@echo off
echo.
echo ========================================
echo   Life Dashboard — Setup
echo ========================================
echo.

:: --- Check Node.js ---
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo.
  echo   Please install Node.js ^(v18 or later^) from:
  echo     https://nodejs.org/
  echo.
  echo   After installing, close this window, open a new one,
  echo   and run this script again.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
echo [OK] Node.js detected

:: --- Check npm ---
where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] npm is not installed. It should come with Node.js.
  echo   Please reinstall Node.js from: https://nodejs.org/
  pause
  exit /b 1
)

echo [OK] npm detected
echo.

:: --- Install dependencies ---
echo [1/2] Installing dependencies (this may take a minute)...
call npm install
if %errorlevel% neq 0 (
  echo [ERROR] npm install failed. Please check the errors above.
  pause
  exit /b 1
)
echo.

:: --- Build the app ---
echo [2/2] Building the app...
call npm run build
if %errorlevel% neq 0 (
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
