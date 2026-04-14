param(
    [switch]$SkipFrontend,
    [switch]$SkipChatbot,
    [switch]$SkipInvestigationCopilot,
    [switch]$NoWait,
    [switch]$KillPorts
)

$Root     = $PSScriptRoot
$Src      = Join-Path $Root "src"
$Chatbot  = Join-Path $Root "chatbot_service"
$InvestigationCopilot = Join-Path $Root "investigation_copilot"
$Frontend = Join-Path $Root "frontend\wallet-platform"

function Write-Header {
    param([string]$Msg)
    Write-Host ""
    Write-Host "  $Msg" -ForegroundColor Cyan
    Write-Host ("  " + ("-" * $Msg.Length)) -ForegroundColor DarkGray
}

function Write-OK([string]$Msg)   { Write-Host "  [OK]  $Msg" -ForegroundColor Green }
function Write-INFO([string]$Msg) { Write-Host "  [..]  $Msg" -ForegroundColor Gray }
function Write-WARN([string]$Msg) { Write-Host "  [WARN] $Msg" -ForegroundColor Yellow }
function Write-ERR([string]$Msg)  { Write-Host "  [ERR] $Msg" -ForegroundColor Red }

function Get-ListenersOnPort {
    param([int]$Port)
    @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
}

function Stop-ListenersOnPorts {
    param([int[]]$Ports)
    foreach ($port in $Ports) {
        foreach ($procId in (Get-ListenersOnPort -Port $port)) {
            if ($procId -le 0) { continue }
            try {
                $p = Get-Process -Id $procId -ErrorAction Stop
                Write-INFO "Free port $port : stop PID $procId ($($p.ProcessName))"
                Stop-Process -Id $procId -Force -ErrorAction Stop
            } catch {
                Write-WARN "Could not stop PID $procId on port $port : $_"
            }
        }
    }
}

$Services = @(
    @{ Name = "API Gateway"; Port = 5000; Path = "Gateway\ApiGateway\ApiGateway.csproj" },
    @{ Name = "AuthService"; Port = 5001; Path = "Services\AuthService\AuthService.API\AuthService.API.csproj" },
    @{ Name = "UserProfileService"; Port = 5002; Path = "Services\UserProfileService\UserProfileService.API\UserProfileService.API.csproj" },
    @{ Name = "WalletService"; Port = 5003; Path = "Services\WalletService\WalletService.API\WalletService.API.csproj" },
    @{ Name = "LedgerService"; Port = 5004; Path = "Services\LedgerService\LedgerService.API\LedgerService.API.csproj" },
    @{ Name = "RewardsService"; Port = 5005; Path = "Services\RewardsService\RewardsService.API\RewardsService.API.csproj" },
    @{ Name = "CatalogService"; Port = 5006; Path = "Services\CatalogService\CatalogService.API\CatalogService.API.csproj" },
    @{ Name = "NotificationService"; Port = 5007; Path = "Services\NotificationService\NotificationService.API\NotificationService.API.csproj" },
    @{ Name = "ReceiptsService"; Port = 5008; Path = "Services\ReceiptsService\ReceiptsService.API\ReceiptsService.API.csproj" },
    @{ Name = "AdminService"; Port = 5009; Path = "Services\AdminService\AdminService.API\AdminService.API.csproj" }
)

$servicePorts = @($Services | ForEach-Object { $_.Port })

if ($KillPorts) {
    Write-Header -Msg "Freeing service ports 5000-5009"
    Stop-ListenersOnPorts -Ports $servicePorts
    Start-Sleep -Milliseconds 500
}

$busy = @()
foreach ($svc in $Services) {
    $pids = Get-ListenersOnPort -Port $svc.Port
    if ($pids.Count -gt 0) {
        $busy += "$($svc.Name) port $($svc.Port) (PIDs: $($pids -join ', '))"
    }
}
if ($busy.Count -gt 0) {
    Write-ERR "Ports still in use. Close old service windows or run: .\start-all.ps1 -KillPorts"
    foreach ($b in $busy) { Write-Host "    - $b" -ForegroundColor Yellow }
    exit 1
}

Write-Header -Msg "Building .NET services (sequential)"
$null = & dotnet build-server shutdown 2>$null
foreach ($svc in $Services) {
    $projFile = Join-Path $Src $svc.Path
    if (-not (Test-Path $projFile)) { continue }
    Write-INFO "dotnet build $($svc.Name)..."
    & dotnet build $projFile --nologo -v minimal
    if ($LASTEXITCODE -ne 0) {
        Write-ERR "Build failed for $($svc.Name). Try: Stop-Process -Name VBCSCompiler -Force -ErrorAction SilentlyContinue"
        exit 1
    }
}
Write-OK ".NET build done"

Write-Header -Msg "Starting .NET microservices"
$jobs = @()

foreach ($svc in $Services) {
    $projFile = Join-Path $Src $svc.Path
    if (-not (Test-Path $projFile)) {
        Write-WARN "$($svc.Name) project not found"
        continue
    }

    $name = $svc.Name
    $port = $svc.Port
    $innerCmd = "& { `$host.UI.RawUI.WindowTitle = '$name'; Write-Host '[START] $name on port $port' -ForegroundColor Cyan; dotnet run --no-build --project '$projFile' }"

    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit"
        "-Command"
        $innerCmd
    ) -WindowStyle Minimized -PassThru

    $jobs += $proc
    Write-INFO "$name -> http://localhost:$port (host PID $($proc.Id))"
}

if (-not $SkipChatbot) {
    Write-Header -Msg "Starting Chatbot"
    $uvicorn = Join-Path $Chatbot "venv\Scripts\uvicorn.exe"
    $python  = Join-Path $Chatbot "venv\Scripts\python.exe"

    if (Test-Path $uvicorn) {
        $chatCmd = "& { `$host.UI.RawUI.WindowTitle = 'Chatbot'; Set-Location '$Chatbot'; & '$uvicorn' main:app --host 0.0.0.0 --port 8000 --reload }"
        Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $chatCmd) -WindowStyle Minimized
        Write-OK "Chatbot http://localhost:8000"
    } elseif (Test-Path $python) {
        $chatCmd = "& { `$host.UI.RawUI.WindowTitle = 'Chatbot'; Set-Location '$Chatbot'; & '$python' -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload }"
        Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $chatCmd) -WindowStyle Minimized
        Write-OK "Chatbot http://localhost:8000"
    } else {
        Write-WARN "Chatbot venv missing. See chatbot_service README."
    }
}

if (-not $SkipInvestigationCopilot) {
    Write-Header -Msg "Starting Investigation Copilot"
    $uvInv = Join-Path $InvestigationCopilot ".venv\Scripts\uvicorn.exe"
    $pyInv = Join-Path $InvestigationCopilot ".venv\Scripts\python.exe"

    if (Test-Path $uvInv) {
        $invCmd = "& { `$host.UI.RawUI.WindowTitle = 'InvestigationCopilot'; Set-Location '$InvestigationCopilot'; & '$uvInv' main:app --host 0.0.0.0 --port 8001 --reload }"
        Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $invCmd) -WindowStyle Minimized
        Write-OK "Investigation Copilot http://localhost:8001"
    } elseif (Test-Path $pyInv) {
        $invCmd = "& { `$host.UI.RawUI.WindowTitle = 'InvestigationCopilot'; Set-Location '$InvestigationCopilot'; & '$pyInv' -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload }"
        Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $invCmd) -WindowStyle Minimized
        Write-OK "Investigation Copilot http://localhost:8001"
    } else {
        Write-WARN "investigation_copilot .venv missing. Run: cd investigation_copilot; python -m venv .venv; pip install -r requirements.txt"
    }
}

if (-not $SkipFrontend) {
    Write-Header -Msg "Starting Angular frontend"
    $ngCmd = "& { `$host.UI.RawUI.WindowTitle = 'Angular'; Set-Location '$Frontend'; ng serve --open }"
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $ngCmd) -WindowStyle Minimized
    Write-INFO "Frontend http://localhost:4200"
}

Write-Header -Msg "All services started"
foreach ($svc in $Services) {
    Write-Host ("  {0,-25} http://localhost:{1}" -f $svc.Name, $svc.Port)
}
if (-not $SkipChatbot) {
    Write-Host ("  {0,-25} {1}" -f "Chatbot", "http://localhost:8000")
}
if (-not $SkipInvestigationCopilot) {
    Write-Host ("  {0,-25} {1}" -f "Investigation Copilot", "http://localhost:8001")
}

Write-Host ""
Write-Host "Press any key to stop tracked .NET host processes..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Header -Msg "Stopping services"
foreach ($job in $jobs) {
    if (-not $job.HasExited) {
        Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-OK "Stopped"
