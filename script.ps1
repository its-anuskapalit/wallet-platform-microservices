<#
.SYNOPSIS
  Convenience wrapper for starting WalletPlatform (microservices, chatbot, investigation copilot, Angular).

.DESCRIPTION
  Forwards all parameters to .\start-all.ps1 in the same directory.

.EXAMPLE
  .\script.ps1

.EXAMPLE
  .\script.ps1 -SkipFrontend -SkipChatbot

.EXAMPLE
  .\script.ps1 -KillPorts
#>

param(
    [switch]$SkipFrontend,
    [switch]$SkipChatbot,
    [switch]$SkipInvestigationCopilot,
    [switch]$NoWait,
    [switch]$KillPorts
)

$here = $PSScriptRoot
$startAll = Join-Path $here "start-all.ps1"
if (-not (Test-Path $startAll)) {
    Write-Error "start-all.ps1 not found at $startAll"
    exit 1
}

& $startAll @PSBoundParameters
