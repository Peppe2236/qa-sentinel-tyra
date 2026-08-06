$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

$files = @(
    (Join-Path $projectRoot "dashboard\index.html"),
    (Join-Path $projectRoot "dashboard\dashboard.js"),
    (Join-Path $projectRoot "scripts\scan-site.mjs"),
    (Join-Path $projectRoot "scripts\serve-dashboard.mjs"),
    (Join-Path $projectRoot "scripts\run-qa.mjs"),
    (Join-Path $projectRoot "reporters\qa-dashboard-reporter.ts"),
    (Join-Path $projectRoot "README.md")
)

# Ordered replacement list avoids PowerShell's case-insensitive hashtable duplicate-key issue.
$replacements = @(
    [pscustomobject]@{
        Old = "QA SENTINEL SMART SCANNER"
        New = "QA SENTINEL TYRA SMART SCANNER"
    },
    [pscustomobject]@{
        Old = "QA SENTINEL WEBSITE SCANNER"
        New = "QA SENTINEL TYRA WEBSITE SCANNER"
    },
    [pscustomobject]@{
        Old = "QA SENTINEL DASHBOARD"
        New = "QA SENTINEL TYRA DASHBOARD"
    },
    [pscustomobject]@{
        Old = "QA Sentinel Dashboard"
        New = "QA Sentinel Tyra Dashboard"
    },
    [pscustomobject]@{
        Old = "QA Sentinel"
        New = "QA Sentinel Tyra"
    }
)

$changedFiles = @()

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        continue
    }

    $content = Get-Content -Path $file -Raw
    $updated = $content

    foreach ($replacement in $replacements) {
        # Prevent repeated runs from producing "QA Sentinel Tyra Tyra".
        if ($updated.Contains($replacement.New)) {
            continue
        }

        $updated = $updated.Replace($replacement.Old, $replacement.New)
    }

    if ($updated -ne $content) {
        Set-Content -Path $file -Value $updated -Encoding UTF8
        $changedFiles += $file
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " QA Sentinel Tyra branding applied" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

if ($changedFiles.Count -eq 0) {
    Write-Host "No files needed updating." -ForegroundColor Yellow
} else {
    Write-Host "Updated files:" -ForegroundColor White
    foreach ($changedFile in $changedFiles) {
        Write-Host " - $changedFile" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Verify scanner branding:" -ForegroundColor White
Write-Host '  Select-String .\scripts\scan-site.mjs -Pattern "QA SENTINEL TYRA"' -ForegroundColor Gray
Write-Host ""
Write-Host "Run the scanner:" -ForegroundColor White
Write-Host "  npm run scan:nation" -ForegroundColor Gray
Write-Host ""
Write-Host "Run the full QA flow:" -ForegroundColor White
Write-Host "  npm run qa" -ForegroundColor Gray
