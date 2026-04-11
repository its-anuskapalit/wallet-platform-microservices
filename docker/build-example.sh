#!/bin/sh
# Example: build one API image from repo root (bash).
# Usage: ./docker/build-example.sh
# Or pass args: ./docker/build-example.sh "src/Gateway/ApiGateway/ApiGateway.csproj" "ApiGateway.dll" "walletplatform-gateway:latest"

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_PATH="${1:-src/Services/WalletService/WalletService.API/WalletService.API.csproj}"
APP_DLL="${2:-WalletService.API.dll}"
TAG="${3:-walletplatform-wallet:latest}"

docker build -f docker/Dockerfile \
  --build-arg "PROJECT_PATH=$PROJECT_PATH" \
  --build-arg "APP_DLL=$APP_DLL" \
  -t "$TAG" \
  .

echo "Built $TAG"
