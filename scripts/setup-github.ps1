#!/usr/bin/env pwsh
# Cup & Co — GitHub setup script (Windows PowerShell).
# Run once after cloning. Authenticates `gh`, creates the remote repo, and pushes main.
#
# Usage (from E:\Kiosk App):
#   .\scripts\setup-github.ps1                 # creates Karim-Elbahrawy/cup-and-co (private)
#   .\scripts\setup-github.ps1 -Visibility public
#   .\scripts\setup-github.ps1 -RepoName my-name
param(
    [string]$RepoName = "cup-and-co",
    [string]$Visibility = "private"
)

$ErrorActionPreference = "Stop"

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

Write-Host ">> Cup & Co GitHub setup"
Write-Host ">> Repo: $RepoName ($Visibility)"
Write-Host ""

# Auth
$authed = $false
try { & $gh auth status 2>$null | Out-Null; $authed = ($LASTEXITCODE -eq 0) } catch { $authed = $false }
if (-not $authed) {
    Write-Host ">> Not signed in. Starting device-code login..."
    & $gh auth login --web --hostname github.com --git-protocol https
}

# Owner
$owner = & $gh api user --jq .login

Write-Host ">> Authed as: $owner"

# Repo exists?
$exists = $false
try { & $gh repo view "$owner/$RepoName" 2>$null | Out-Null; $exists = ($LASTEXITCODE -eq 0) } catch { $exists = $false }
if ($exists) {
    Write-Host ">> Repo $owner/$RepoName already exists. Linking remote..."
} else {
    Write-Host ">> Creating repo $owner/$RepoName..."
    & $gh repo create "$owner/$RepoName" --$Visibility --source=. --remote=origin --description="Cup & Co - campus coffee kiosk app (iOS + web + admin + API)"
}

# Ensure origin
$hasOrigin = $false
try { git remote get-url origin 2>$null | Out-Null; $hasOrigin = ($LASTEXITCODE -eq 0) } catch { $hasOrigin = $false }
if (-not $hasOrigin) {
    git remote add origin "https://github.com/$owner/$RepoName.git"
}

Write-Host ">> Pushing main..."
git push -u origin main

Write-Host ""
Write-Host ">> Done. Repo: https://github.com/$owner/$RepoName"
