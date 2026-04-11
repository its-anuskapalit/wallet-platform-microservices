# Build any API project from this repo (context = repository root).
#
# Example (from repo root):
#   docker build -f docker/Dockerfile \
#     --build-arg PROJECT_PATH=src/Services/WalletService/WalletService.API/WalletService.API.csproj \
#     --build-arg APP_DLL=WalletService.API.dll \
#     -t walletplatform-wallet:latest .
#
# APP_DLL must match the main published assembly (usually <csproj name>.dll).

ARG SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:10.0
ARG RUNTIME_IMAGE=mcr.microsoft.com/dotnet/aspnet:10.0

FROM ${SDK_IMAGE} AS build
WORKDIR /src

COPY WalletPlatform.slnx ./
COPY src ./src

ARG PROJECT_PATH=src/Services/WalletService/WalletService.API/WalletService.API.csproj
RUN dotnet restore "$PROJECT_PATH"
RUN dotnet publish "$PROJECT_PATH" -c Release -o /app/publish --no-restore

FROM ${RUNTIME_IMAGE} AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ARG APP_DLL=WalletService.API.dll
COPY --from=build /app/publish .

RUN printf '#!/bin/sh\nexec dotnet %s\n' "$APP_DLL" > /app/start.sh \
    && chmod +x /app/start.sh

ENTRYPOINT ["/app/start.sh"]
