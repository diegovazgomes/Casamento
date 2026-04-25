#!/usr/bin/env pwsh
<#
.SYNOPSIS
ASCII-only dashboard validation script.

.DESCRIPTION
Runs local file and contract checks for the dashboard without requiring a server.
#>

param(
    [switch]$ShowDetails = $false
)

$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Warning = 'Yellow'
    Info    = 'Cyan'
}

function Write-Status {
    param([string]$Message, [string]$Status)

    $symbol = if ($Status -eq 'OK') { '[OK]' } elseif ($Status -eq 'FAIL') { '[FAIL]' } else { '[WARN]' }
    $color = if ($Status -eq 'OK') { $colors.Success } elseif ($Status -eq 'FAIL') { $colors.Error } else { $colors.Warning }
    Write-Host "$symbol $Message" -ForegroundColor $color
}

function Test-File {
    param([string]$Path, [string]$Description)

    $exists = Test-Path $Path
    $status = if ($exists) { 'OK' } else { 'FAIL' }
    Write-Status $Description $status

    if ($ShowDetails -and $exists) {
        $lines = (Get-Content $Path | Measure-Object -Line).Lines
        Write-Host "   Lines: $lines" -ForegroundColor Gray
    }

    return $exists
}

function Test-JsonValidation {
    param([string]$Path, [string]$Description)

    try {
        Get-Content $Path -Raw | ConvertFrom-Json | Out-Null
        Write-Status "$Description (JSON valido)" 'OK'
        return $true
    } catch {
        Write-Status "$Description (JSON invalido)" 'FAIL'
        Write-Host "   Erro: $_" -ForegroundColor Red
        return $false
    }
}

function Test-JsonProperty {
    param([string]$JsonPath, [string[]]$Properties, [string]$Description)

    try {
        $json = Get-Content $JsonPath -Raw | ConvertFrom-Json
        $missingProps = @()

        foreach ($prop in $Properties) {
            $value = $json
            foreach ($part in $prop.Split('.')) {
                $value = $value.$part
            }

            if ($null -eq $value) {
                $missingProps += $prop
            }
        }

        if ($missingProps.Count -eq 0) {
            Write-Status $Description 'OK'
            return $true
        }

        Write-Status $Description 'FAIL'
        Write-Host "   Faltando: $($missingProps -join ', ')" -ForegroundColor Yellow
        return $false
    } catch {
        Write-Status $Description 'FAIL'
        Write-Host "   Erro ao ler JSON: $_" -ForegroundColor Red
        return $false
    }
}

Clear-Host
Write-Host "`n========================================================`n" -ForegroundColor Cyan
Write-Host "  Dashboard Validation - Full Check (21/04/2026)" -ForegroundColor Cyan
Write-Host "`n========================================================`n" -ForegroundColor Cyan

$passedTests = 0
$totalTests = 0

Write-Host "`nTEST 1: File Structure`n" -ForegroundColor Cyan

$files = @(
    @{ Path = 'dashboard.html'; Desc = 'Dashboard HTML page' },
    @{ Path = 'assets/js/dashboard.js'; Desc = 'Dashboard JavaScript logic' },
    @{ Path = 'assets/js/dashboard-theme-config.js'; Desc = 'Dashboard theme/config bootstrap' },
    @{ Path = 'api/dashboard/auth.js'; Desc = 'Auth endpoint' },
    @{ Path = 'api/dashboard/guest-groups.js'; Desc = 'Guest groups CRUD' },
    @{ Path = 'api/dashboard/confirmations.js'; Desc = 'Confirmations endpoint' },
    @{ Path = 'api/dashboard/reminders.js'; Desc = 'Reminders endpoint' },
    @{ Path = 'tests/integration/dashboard.integration.test.js'; Desc = 'Dashboard integration tests' },
    @{ Path = 'tests/integration/dashboard-theme-config.test.js'; Desc = 'Dashboard theme bootstrap tests' }
)

foreach ($file in $files) {
    $totalTests++
    if (Test-File -Path $file.Path -Description $file.Desc) {
        $passedTests++
    }
}

Write-Host "`nTEST 2: JSON Validation`n" -ForegroundColor Cyan

$totalTests++
if (Test-JsonValidation -Path 'assets/config/site.json' -Description 'site.json') {
    $passedTests++
}

$totalTests++
if (Test-JsonValidation -Path 'assets/config/schemas/site-schema.json' -Description 'site-schema.json') {
    $passedTests++
}

Write-Host "`nTEST 3: Dashboard Config Inputs`n" -ForegroundColor Cyan

$totalTests++
if (Test-JsonProperty -JsonPath 'assets/config/site.json' -Properties @('activeTheme', 'activeLayout', 'rsvp.eventId', 'couple.names', 'event.heroDate') -Description 'site.json fornece tema/layout/evento para o dashboard') {
    $passedTests++
}

Write-Host "`nTEST 4: Schema Coverage`n" -ForegroundColor Cyan

$totalTests++
$schemaContent = Get-Content 'assets/config/schemas/site-schema.json' -Raw
if ($schemaContent -match '"activeTheme"' -and $schemaContent -match '"activeLayout"' -and $schemaContent -match '"rsvp"') {
    Write-Status 'Schema cobre layout/tema/rsvp consumidos pelo dashboard' 'OK'
    $passedTests++
} else {
    Write-Status 'Schema cobre layout/tema/rsvp consumidos pelo dashboard' 'FAIL'
}

Write-Host "`nTEST 5: Supabase Schema`n" -ForegroundColor Cyan

$totalTests++
$sqlContent = Get-Content 'docs/supabase-setup.sql' -Raw
$requiredTables = @('couple_credentials', 'guest_views', 'reminder_logs')
$foundTables = 0

foreach ($table in $requiredTables) {
    if ($sqlContent -match "create table $table") {
        $foundTables++
    }
}

if ($foundTables -eq $requiredTables.Count) {
    Write-Status 'Todas as tabelas esperadas estao no SQL' 'OK'
    $passedTests++
} else {
    Write-Status "Apenas $foundTables/$($requiredTables.Count) tabelas encontradas" 'FAIL'
}

Write-Host "`nTEST 6: Test Suite Presence`n" -ForegroundColor Cyan

$totalTests++
$testFileContent = Get-Content 'tests/integration/dashboard.integration.test.js' -Raw
if ($testFileContent -match 'describe.*Dashboard' -and $testFileContent -match 'it\(') {
    Write-Status 'Arquivo de testes possui estrutura valida' 'OK'
    $passedTests++
} else {
    Write-Status 'Arquivo de testes incompleto' 'FAIL'
}

Write-Host "`nTEST 7: Environment Prerequisites`n" -ForegroundColor Cyan

$envFileExists = Test-Path '.env.local'
$totalTests++
if ($envFileExists) {
    $envContent = Get-Content '.env.local' -Raw
    if ($envContent -match 'SUPABASE_URL' -and $envContent -match 'DASHBOARD_PASSWORD') {
        Write-Status 'Arquivo .env.local contem variaveis obrigatorias' 'OK'
        $passedTests++
    } else {
        Write-Status 'Arquivo .env.local existe, mas faltam variaveis obrigatorias' 'WARN'
        $passedTests++
    }
} else {
    Write-Status 'Arquivo .env.local nao encontrado; necessario apenas para testar endpoints reais' 'WARN'
    $passedTests++
}

Write-Host "`nTEST 8: Current Markup Contract`n" -ForegroundColor Cyan

$totalTests++
$dashboardContent = Get-Content 'dashboard.html' -Raw
$requiredElements = @('id="authScreen"', 'id="dashboardScreen"', 'id="tab-overview"', 'id="gruposTable"', 'id="confirmacoesTable"', 'id="modalGrupo"', 'id="modalLembrete"')
$foundElements = 0

foreach ($elem in $requiredElements) {
    if ($dashboardContent -match [regex]::Escape($elem)) {
        $foundElements++
    }
}

if ($foundElements -eq $requiredElements.Count) {
    Write-Status 'dashboard.html contem os elementos principais do layout atual' 'OK'
    $passedTests++
} else {
    Write-Status "dashboard.html faltam elementos ($foundElements/$($requiredElements.Count))" 'FAIL'
}

$totalTests++
$jsContent = Get-Content 'assets/js/dashboard.js' -Raw
$requiredFunctions = @('handleAuth', 'loadGrupos', 'handleSaveGrupo', 'reloadConfirmacoes', 'handleDownloadCsv', 'applySiteConfig', 'updateOverview')
$foundFunctions = 0

foreach ($func in $requiredFunctions) {
    if ($jsContent -match "function $func|async function $func|const $func") {
        $foundFunctions++
    }
}

if ($foundFunctions -eq $requiredFunctions.Count) {
    Write-Status 'dashboard.js contem as funcoes principais do contrato atual' 'OK'
    $passedTests++
} else {
    Write-Status "dashboard.js faltam funcoes ($foundFunctions/$($requiredFunctions.Count))" 'FAIL'
}

$percentual = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "`n========================================================`n" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY`n" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan
Write-Host "Result: $passedTests/$totalTests tests passed ($percentual%)`n"

if ($percentual -eq 100) {
    Write-Host '[OK] Full dashboard validation passed.' -ForegroundColor Green
} elseif ($percentual -ge 80) {
    Write-Host '[WARN] Dashboard validation passed with warnings.' -ForegroundColor Yellow
} else {
    Write-Host '[FAIL] Dashboard validation found blocking issues.' -ForegroundColor Red
}

exit $(if ($percentual -ge 80) { 0 } else { 1 })
