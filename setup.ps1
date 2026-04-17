$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "  Life Dashboard - Setup"
Write-Host "========================================"
Write-Host ""

# --- Heads-up about PowerShell execution policy ---
# If the user ran "./setup.ps1" directly without a bypass, PowerShell may
# refuse to execute the script. Detect that situation and print the fix.
try {
    $policy = Get-ExecutionPolicy -Scope Process
    if ($policy -eq "Restricted" -or $policy -eq "AllSigned") {
        Write-Host "[INFO] Your PowerShell execution policy is '$policy'." -ForegroundColor Yellow
        Write-Host "       If this script will not run, close this window and re-launch with:"
        Write-Host "         powershell -ExecutionPolicy Bypass -File setup.ps1"
        Write-Host ""
    }
} catch {
    # Non-fatal: just continue.
}

# --- Check Node.js ---
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "[ERROR] Node.js is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Node.js (v20 or later) from:"
    Write-Host "    https://nodejs.org/"
    Write-Host ""
    Write-Host "  After installing, close this terminal, open a new one,"
    Write-Host "  and run this script again."
    exit 1
}

$nodeVersion = (node -v) -replace '^v', ''
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Host "[ERROR] Node.js v20+ is required (you have v$nodeVersion)." -ForegroundColor Red
    Write-Host "  Please update from: https://nodejs.org/"
    exit 1
}

Write-Host "[OK] Node.js v$nodeVersion detected" -ForegroundColor Green

# --- Check npm ---
$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmPath) {
    Write-Host "[ERROR] npm is not installed. It should come with Node.js." -ForegroundColor Red
    Write-Host "  Please reinstall Node.js from: https://nodejs.org/"
    exit 1
}

$npmVersion = npm -v
Write-Host "[OK] npm $npmVersion detected" -ForegroundColor Green
Write-Host ""

# --- Clean stale build cache so module resolution starts from a known state ---
if (Test-Path ".next") {
    Write-Host "[INFO] Removing stale .next build cache..."
    Remove-Item -Recurse -Force ".next"
}

# --- Install dependencies ---
Write-Host "[1/2] Installing dependencies (this may take a minute)..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] npm install failed." -ForegroundColor Red
    Write-Host ""
    Write-Host "  If you see errors about 'node-gyp' or 'better-sqlite3':"
    Write-Host "    1. Install Visual Studio Build Tools from:"
    Write-Host "       https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    Write-Host "    2. During installation, select 'Desktop development with C++'"
    Write-Host "    3. Restart this terminal and run this script again"
    Write-Host ""
    Write-Host "  Alternatively, make sure you are using Node.js v20 or v22 LTS"
    Write-Host "  which includes prebuilt native binaries."
    exit 1
}
Write-Host ""

# Show the installed crypto library version so a regression is visible.
Write-Host "[INFO] Installed @noble/hashes version:"
npm ls @noble/hashes --depth=0 2>$null
Write-Host ""

# --- Build the app ---
Write-Host "[2/2] Building the app..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Build failed. Please check the errors above." -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================"
Write-Host "  Setup complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "  To start the dashboard, run:"
Write-Host ""
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Then open http://localhost:3000 in your browser."
Write-Host ""
Write-Host "  The database is created automatically on first launch."
Write-Host ""
