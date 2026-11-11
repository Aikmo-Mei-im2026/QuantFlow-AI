param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 9000,
    [switch]$Reload
)

$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path $PSScriptRoot '../backend'
$backendPython = Join-Path $backendRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $backendPython)) {
    throw 'Missing backend/.venv. Follow backend/README.md to install the isolated environment.'
}

$serverArgs = @('-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', "$Port", '--no-access-log')
if ($Reload) { $serverArgs += '--reload' }

Push-Location -LiteralPath $backendRoot
try {
    & $backendPython @serverArgs
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
}
finally {
    Pop-Location
}
