# Example: build one API image from repo root (PowerShell).
# Adjust PROJECT_PATH, APP_DLL, and tag as needed.

param(
    [string]$ProjectPath = "src/Services/WalletService/WalletService.API/WalletService.API.csproj",
    [string]$AppDll     = "WalletService.API.dll",
    [string]$Tag        = "walletplatform-wallet:latest"
)

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

docker build `
    -f docker/Dockerfile `
    --build-arg "PROJECT_PATH=$ProjectPath" `
    --build-arg "APP_DLL=$AppDll" `
    -t $Tag `
    .

Write-Host "Built $Tag" -ForegroundColor Green
