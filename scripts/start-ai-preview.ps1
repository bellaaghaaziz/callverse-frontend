$ErrorActionPreference = 'Stop'
$previewEnvNames = @('AI_PREVIEW_KEY', 'LLM_PROVIDER', 'OLLAMA_MODEL', 'QUALITY_MODEL', 'BACKEND_BASE_URL')
$previewSavedEnv = @{}
foreach ($previewEnvName in $previewEnvNames) {
    $previewSavedEnv[$previewEnvName] = [Environment]::GetEnvironmentVariable($previewEnvName, 'Process')
}
$frontendRoot = Split-Path $PSScriptRoot -Parent
$workspaceRoot = Split-Path $frontendRoot -Parent
$aiRoot = Join-Path $workspaceRoot 'callverse-ai'
$runtimeRoot = Join-Path $workspaceRoot '.test-tools'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$keyPath = Join-Path $runtimeRoot 'ai-preview-key.txt'
if (-not (Test-Path -LiteralPath $keyPath)) {
    [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') | Set-Content -LiteralPath $keyPath
}
$env:AI_PREVIEW_KEY = (Get-Content -LiteralPath $keyPath -Raw).Trim()
$env:LLM_PROVIDER = 'ollama'
$env:OLLAMA_MODEL = 'qwen2.5:3b'
$env:QUALITY_MODEL = 'qwen2.5:3b'
$env:BACKEND_BASE_URL = 'http://localhost:8080'
$aiProcess = $null
if (-not (Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue)) {
    $aiProcess = Start-Process -FilePath (Join-Path $aiRoot '.venv\Scripts\python.exe') -WorkingDirectory $aiRoot -ArgumentList @('-m', 'uvicorn', 'app.preview:app', '--host', '127.0.0.1', '--port', '8001') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'ai-preview.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'ai-preview.stderr.log')
}
try {
    Set-Location $frontendRoot
    npm run dev -- --hostname 127.0.0.1
} finally {
    if ($aiProcess -and -not $aiProcess.HasExited) { Stop-Process -Id $aiProcess.Id }
    foreach ($previewEnvName in $previewEnvNames) {
        [Environment]::SetEnvironmentVariable($previewEnvName, $previewSavedEnv[$previewEnvName], 'Process')
    }
}
