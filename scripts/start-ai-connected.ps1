param([int]$FrontendPort = 3100, [int]$BackendPort = 8083, [int]$AiPort = 8002)
$ErrorActionPreference = 'Stop'
$frontendRoot = Split-Path $PSScriptRoot -Parent
$workspaceRoot = Split-Path $frontendRoot -Parent
$backendRoot = Join-Path $workspaceRoot 'callverse-backend-ai'
$aiRoot = Join-Path $backendRoot 'ai-service'
$runtimeRoot = Join-Path $workspaceRoot '.test-tools'
$pythonPath = Join-Path $aiRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    $pythonPath = Join-Path $workspaceRoot 'callverse-ai\.venv\Scripts\python.exe'
}
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Installez les dépendances ai-service dans son environnement .venv.' }
foreach ($port in @($FrontendPort, $BackendPort, $AiPort)) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    try { $listener.Start() } catch { throw "Le port $port est déjà utilisé. Choisissez un autre port." }
    finally { $listener.Stop() }
}
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$savedEnv = @{}
function Set-LocalEnv([string]$name, [string]$value) {
    if (-not $savedEnv.ContainsKey($name)) { $savedEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
function Read-LocalEnv([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return }
    foreach ($line in Get-Content -LiteralPath $path) {
        if ($line -match '^\s*#|^\s*$') { continue }
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) { Set-LocalEnv $parts[0].Trim() $parts[1].Trim().Trim('"').Trim("'") }
    }
}
$backendProcess = $null
$aiProcess = $null
try {
    Read-LocalEnv (Join-Path $workspaceRoot 'callverse-backend\.env')
    Read-LocalEnv (Join-Path $backendRoot '.env')
    Read-LocalEnv (Join-Path $workspaceRoot 'callverse-ai\.env')
    Read-LocalEnv (Join-Path $aiRoot '.env')
    if (-not $env:LLM_API_KEY) { Write-Host 'Conseiller et simulateur : configurez LLM_API_KEY dans ai-service/.env pour les appels Groq.' }
    if (-not $env:QUALITY_MODEL) { Write-Host 'Qualité : configurez QUALITY_MODEL avec un modèle disponible dans Ollama.' }
    $keyPath = Join-Path $runtimeRoot 'ai-connected-key.txt'
    if (-not (Test-Path -LiteralPath $keyPath)) {
        [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') | Set-Content -LiteralPath $keyPath
    }
    $localKey = (Get-Content -LiteralPath $keyPath -Raw).Trim()
    Set-LocalEnv 'INTERNAL_SERVICE_KEY' $localKey
    Set-LocalEnv 'AI_SERVICE_KEY' $localKey
    Set-LocalEnv 'CALLVERSE_BACKEND_BASE_URL' "http://localhost:$BackendPort"
    Set-LocalEnv 'AI_SERVICE_BASE_URL' "http://127.0.0.1:$AiPort"
    Set-LocalEnv 'SERVER_PORT' "$BackendPort"
    Set-LocalEnv 'CORS_ALLOWED_ORIGINS' "http://localhost:$FrontendPort,http://127.0.0.1:$FrontendPort"
    Set-LocalEnv 'NEXT_PUBLIC_API_URL' "http://localhost:$BackendPort/api/v1"
    Set-LocalEnv 'NEXT_PUBLIC_WS_URL' "ws://localhost:$BackendPort/ws"
    Set-LocalEnv 'CALLVERSE_BUILD_DIR' '.next-ai-connected'
    Set-LocalEnv 'SPRING_PROFILES_ACTIVE' 'dev'
    Set-LocalEnv 'LOGGING_LEVEL_ROOT' 'WARN'
    Set-LocalEnv 'LOGGING_LEVEL_ORG_HIBERNATE' 'WARN'
    Set-LocalEnv 'LOGGING_LEVEL_ORG_HIBERNATE_ORM_JDBC_BIND' 'WARN'
    Set-LocalEnv 'LOGGING_LEVEL_COM_CALLVERSE' 'INFO'
    Set-LocalEnv 'SPRING_JPA_SHOW_SQL' 'false'
    $backendProcess = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backendRoot -ArgumentList @('/c', 'mvnw.cmd spring-boot:run') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'ai-connected-backend.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'ai-connected-backend.stderr.log')
    $aiProcess = Start-Process -FilePath $pythonPath -WorkingDirectory $aiRoot -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', "$AiPort") -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'ai-connected-python.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'ai-connected-python.stderr.log')
    Write-Host "CallVerse IA : http://localhost:$FrontendPort — backend $BackendPort — service IA $AiPort"
    Push-Location $frontendRoot
    try { npm run dev -- --hostname 127.0.0.1 --port $FrontendPort } finally { Pop-Location }
} finally {
    # Stop only process trees created by this launcher, including the Java child of Maven.
    foreach ($child in @($backendProcess, $aiProcess)) {
        if ($child -and -not $child.HasExited) { & taskkill.exe /PID $child.Id /T /F | Out-Null }
    }
    foreach ($name in $savedEnv.Keys) { [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], 'Process') }
}
