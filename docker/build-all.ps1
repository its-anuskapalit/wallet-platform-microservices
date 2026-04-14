# Build all WalletPlatform API images. Run from repo root:
#   powershell -ExecutionPolicy Bypass -File docker/build-all.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "WalletPlatform.slnx"))) {
    throw "Run from repo root or keep this script at docker/build-all.ps1 (expected WalletPlatform.slnx in parent folder)."
}
Set-Location $root

$services = @(
    @{ P = "src/Services/AdminService/AdminService.API/AdminService.API.csproj";        D = "AdminService.API.dll";        T = "walletplatform-admin:latest" },
    @{ P = "src/Services/AuthService/AuthService.API/AuthService.API.csproj";          D = "AuthService.API.dll";          T = "walletplatform-auth:latest" },
    @{ P = "src/Services/CatalogService/CatalogService.API/CatalogService.API.csproj"; D = "CatalogService.API.dll";     T = "walletplatform-catalog:latest" },
    @{ P = "src/Services/LedgerService/LedgerService.API/LedgerService.API.csproj";    D = "LedgerService.API.dll";      T = "walletplatform-ledger:latest" },
    @{ P = "src/Services/NotificationService/NotificationService.API/NotificationService.API.csproj"; D = "NotificationService.API.dll"; T = "walletplatform-notification:latest" },
    @{ P = "src/Services/ReceiptsService/ReceiptsService.API/ReceiptsService.API.csproj"; D = "ReceiptsService.API.dll"; T = "walletplatform-receipts:latest" },
    @{ P = "src/Services/RewardsService/RewardsService.API/RewardsService.API.csproj";   D = "RewardsService.API.dll";     T = "walletplatform-rewards:latest" },
    @{ P = "src/Services/UserProfileService/UserProfileService.API/UserProfileService.API.csproj"; D = "UserProfileService.API.dll"; T = "walletplatform-userprofile:latest" },
    @{ P = "src/Services/WalletService/WalletService.API/WalletService.API.csproj";      D = "WalletService.API.dll";      T = "walletplatform-wallet:latest" },
    @{ P = "src/Gateway/ApiGateway/ApiGateway.csproj";                                 D = "ApiGateway.dll";              T = "walletplatform-gateway:latest" }
)

foreach ($s in $services) {
    Write-Host "`n========== $($s.T) ==========" -ForegroundColor Cyan
    docker build -f docker/Dockerfile `
        --build-arg PROJECT_PATH=$($s.P) `
        --build-arg APP_DLL=$($s.D) `
        -t $($s.T) .
    if ($LASTEXITCODE -ne 0) { throw "docker build failed: $($s.T)" }
}

Write-Host "`n========== walletplatform images ==========" -ForegroundColor Green
docker images --filter "reference=walletplatform-*" --format "table {{.Repository}}`t{{.Tag}}`t{{.Size}}`t{{.ID}}"
