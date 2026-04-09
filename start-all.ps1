param(
    [switch]$SkipFrontend,
    [switch]$SkipChatbot,
    [switch]$NoWait
)

$Root     = $PSScriptRoot
$Src      = Join-Path $Root "src"
$Chatbot  = Join-Path $Root "chatbot_service"
$Frontend = Join-Path $Root "frontend\wallet-platform"

function Write-Header($msg) {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("  " + ("-" * ($msg.Length))) -ForegroundColor DarkGray
}

function Write-OK($msg)   { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-INFO($msg) { Write-Host "  [..]  $msg" -ForegroundColor Gray }
function Write-WARN($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-ERR($msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red }

$Services = @(
    @{ Name="API Gateway"; Port=5000; Path="Gateway\ApiGateway\ApiGateway.csproj" },
    @{ Name="AuthService"; Port=5001; Path="Services\AuthService\AuthService.API\AuthService.API.csproj" },
    @{ Name="UserProfileService"; Port=5002; Path="Services\UserProfileService\UserProfileService.API\UserProfileService.API.csproj" },
    @{ Name="WalletService"; Port=5003; Path="Services\WalletService\WalletService.API\WalletService.API.csproj" },
    @{ Name="LedgerService"; Port=5004; Path="Services\LedgerService\LedgerService.API\LedgerService.API.csproj" },
    @{ Name="RewardsService"; Port=5005; Path="Services\RewardsService\RewardsService.API\RewardsService.API.csproj" },
    @{ Name="CatalogService"; Port=5006; Path="Services\CatalogService\CatalogService.API\CatalogService.API.csproj" },
    @{ Name="NotificationService"; Port=5007; Path="Services\NotificationService\NotificationService.API\NotificationService.API.csproj" },
    @{ Name="ReceiptsService"; Port=5008; Path="Services\ReceiptsService\ReceiptsService.API\ReceiptsService.API.csproj" },
    @{ Name="AdminService"; Port=5009; Path="Services\AdminService\AdminService.API\AdminService.API.csproj" }
)

Write-Header "Starting .NET microservices"

$jobs = @()

foreach ($svc in $Services) {
    $projFile = Join-Path $Src $svc.Path

    if (-not (Test-Path $projFile)) {
        Write-WARN "$($svc.Name) project not found"
        continue
    }

    $proc = Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", "
            `$host.UI.RawUI.WindowTitle = '$($svc.Name)';
            Write-Host '[START] $($svc.Name) on port $($svc.Port)' -ForegroundColor Cyan;
            dotnet run --project '$projFile'
        " `
        -WindowStyle Minimized `
        -PassThru

    $jobs += $proc

    Write-INFO "$($svc.Name) -> http://localhost:$($svc.Port) (PID $($proc.Id))"
}

if (-not $SkipChatbot) {
    Write-Header "Starting Chatbot"

    $uvicorn = Join-Path $Chatbot "venv\Scripts\uvicorn.exe"
    $python  = Join-Path $Chatbot "venv\Scripts\python.exe"

    if (Test-Path $uvicorn) {
        Start-Process powershell `
            -ArgumentList "-NoExit", "-Command", "
                `$host.UI.RawUI.WindowTitle = 'WalletBot (Chatbot)';
                cd '$Chatbot';
                & '$uvicorn' main:app --host 0.0.0.0 --port 8000 --reload
            " `
            -WindowStyle Minimized

        Write-OK "Chatbot -> http://localhost:8000"
    } elseif (Test-Path $python) {
        Start-Process powershell `
            -ArgumentList "-NoExit", "-Command", "
                `$host.UI.RawUI.WindowTitle = 'WalletBot (Chatbot)';
                cd '$Chatbot';
                & '$python' -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
            " `
            -WindowStyle Minimized

        Write-OK "Chatbot -> http://localhost:8000"
    } else {
        Write-WARN "Chatbot venv not found - run: cd chatbot_service; python -m venv venv; venv\Scripts\pip install -r requirements.txt"
    }
}

if (-not $SkipFrontend) {
    Write-Header "Starting Angular Frontend"

    Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", "
            `$host.UI.RawUI.WindowTitle = 'Angular';
            cd '$Frontend';
            ng serve --open
        "

    Write-INFO "Frontend -> http://localhost:4200"
}

Write-Header "All services started"

foreach ($svc in $Services) {
    Write-Host ("  {0,-25} http://localhost:{1}" -f $svc.Name, $svc.Port)
}

Write-Host ""
Write-Host "Press any key to stop all services..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Header "Stopping services"

foreach ($job in $jobs) {
    if (-not $job.HasExited) {
        Stop-Process -Id $job.Id -Force
    }
}

Write-OK "All services stopped"