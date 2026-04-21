#!/usr/bin/env pwsh
<#
.SYNOPSIS
Script de validacao rapida do Dashboard

.DESCRIPTION
Executa uma serie de testes para validar se o dashboard foi implementado corretamente.

.EXAMPLE
./test-dashboard-simple.ps1
#>

param([switch]$ShowDetails = $false)

# Cores
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
    Write-Status "$Description" $status
    
    if ($ShowDetails -and $exists) {
        $lines = @(Get-Content $Path).Count
        Write-Host "      Linhas: $lines" -ForegroundColor Gray
    }
    
    return $exists
}

function Test-JsonValidation {
    param([string]$Path, [string]$Description)
    
    try {
        $json = Get-Content $Path -Raw | ConvertFrom-Json
        Write-Status "$Description (JSON valido)" 'OK'
        return $true
    }
    catch {
        Write-Status "$Description (JSON invalido)" 'FAIL'
        Write-Host "      Erro: $_" -ForegroundColor Red
        return $false
    }
}

# ============================================================
# INICIO DOS TESTES
# ============================================================

Clear-Host
Write-Host "`n========================================================`n" -ForegroundColor Cyan
Write-Host "  Validacao do Dashboard - Fase 1 (21/04/2026)" -ForegroundColor Cyan
Write-Host "`n========================================================`n" -ForegroundColor Cyan

$passedTests = 0
$totalTests = 0

# ============================================================
# 1. ESTRUTURA DE ARQUIVOS
# ============================================================

Write-Host "`nTESTE 1: Estrutura de Arquivos`n" -ForegroundColor Cyan

$files = @(
    @{ Path = "dashboard.html"; Desc = "Pagina HTML do dashboard" },
    @{ Path = "assets/js/dashboard.js"; Desc = "Logica JavaScript do dashboard" },
    @{ Path = "api/dashboard/auth.js"; Desc = "Endpoint de autenticacao" },
    @{ Path = "api/dashboard/guest-groups.js"; Desc = "CRUD de grupos" },
    @{ Path = "api/dashboard/confirmations.js"; Desc = "Listagem e export de confirmacoes" },
    @{ Path = "api/dashboard/reminders.js"; Desc = "Endpoint de lembretes" },
    @{ Path = "tests/integration/dashboard.integration.test.js"; Desc = "Testes de integracao" }
)

foreach ($file in $files) {
    $totalTests++
    if (Test-File -Path $file.Path -Description $file.Desc) {
        $passedTests++
    }
}

# ============================================================
# 2. VALIDACAO DE JSON
# ============================================================

Write-Host "`nTESTE 2: Validacao de JSON`n" -ForegroundColor Cyan

$totalTests++
if (Test-JsonValidation -Path "assets/config/site.json" -Description "site.json") {
    $passedTests++
}

$totalTests++
if (Test-JsonValidation -Path "assets/config/schemas/site-schema.json" -Description "site-schema.json") {
    $passedTests++
}

# ============================================================
# 3. CONFIGURACAO DO DASHBOARD
# ============================================================

Write-Host "`nTESTE 3: Configuracao do Dashboard`n" -ForegroundColor Cyan

$totalTests++
try {
    $siteJson = Get-Content "assets/config/site.json" -Raw | ConvertFrom-Json
    if ($siteJson.dashboard -and $siteJson.dashboard.enabled -and $siteJson.dashboard.eventId) {
        Write-Status "Bloco 'dashboard' em site.json" 'OK'
        $passedTests++
    } else {
        Write-Status "Bloco 'dashboard' incompleto em site.json" 'FAIL'
    }
} catch {
    Write-Status "Erro ao verificar dashboard em site.json" 'FAIL'
}

# ============================================================
# 4. SCHEMA VALIDACAO
# ============================================================

Write-Host "`nTESTE 4: Schema de Validacao`n" -ForegroundColor Cyan

$totalTests++
$schemaContent = Get-Content "assets/config/schemas/site-schema.json" -Raw
if ($schemaContent -match '"dashboard"') {
    Write-Status "Schema contem propriedade 'dashboard'" 'OK'
    $passedTests++
} else {
    Write-Status "Schema nao contem propriedade 'dashboard'" 'FAIL'
}

# ============================================================
# 5. BANCO DE DADOS
# ============================================================

Write-Host "`nTESTE 5: Schema Supabase`n" -ForegroundColor Cyan

$totalTests++
$sqlContent = Get-Content "docs/supabase-setup.sql" -Raw
$requiredTables = @('couple_credentials', 'guest_views', 'reminder_logs')
$foundTables = 0

foreach ($table in $requiredTables) {
    if ($sqlContent -match "create table $table") {
        $foundTables++
    }
}

if ($foundTables -eq 3) {
    Write-Status "Todas as 3 tabelas foram adicionadas ao SQL" 'OK'
    $passedTests++
} else {
    Write-Status "Apenas $foundTables/3 tabelas encontradas" 'FAIL'
}

# ============================================================
# 6. TESTES UNITARIOS
# ============================================================

Write-Host "`nTESTE 6: Suite de Testes`n" -ForegroundColor Cyan

$totalTests++
$testFileContent = Get-Content "tests/integration/dashboard.integration.test.js" -Raw
if ($testFileContent -match 'describe.*Dashboard' -and $testFileContent -match 'it\(') {
    Write-Status "Arquivo de testes possui estrutura valida" 'OK'
    $passedTests++
} else {
    Write-Status "Arquivo de testes incompleto" 'FAIL'
}

# ============================================================
# 7. VARIAVEIS DE AMBIENTE
# ============================================================

Write-Host "`nTESTE 7: Variaveis de Ambiente`n" -ForegroundColor Cyan

$envFileExists = Test-Path ".env.local"
$totalTests++

if ($envFileExists) {
    Write-Status "Arquivo .env.local existe" 'OK'
    $passedTests++
} else {
    Write-Status "Arquivo .env.local nao encontrado (criar manualmente)" 'FAIL'
    Write-Host "   Dica: Crie .env.local na raiz com SUPABASE_URL e DASHBOARD_PASSWORD" -ForegroundColor Yellow
}

# ============================================================
# 8. VALIDACAO DE CONTEUDO
# ============================================================

Write-Host "`nTESTE 8: Validacao de Conteudo`n" -ForegroundColor Cyan

# Verificar se dashboard.html contem elementos principais
$totalTests++
$dashboardContent = Get-Content "dashboard.html" -Raw
$requiredElements = @('authScreen', 'dashboardScreen', 'gruposBody', 'modalGrupo')
$foundElements = 0

foreach ($elem in $requiredElements) {
    if ($dashboardContent -match "id=`"$elem`"") {
        $foundElements++
    }
}

if ($foundElements -eq 4) {
    Write-Status "dashboard.html contem elementos principais" 'OK'
    $passedTests++
} else {
    Write-Status "dashboard.html faltam elementos ($foundElements/4)" 'FAIL'
}

# Verificar se dashboard.js contem funcoes principais
$totalTests++
$jsContent = Get-Content "assets/js/dashboard.js" -Raw
$requiredFunctions = @('handleAuth', 'loadGrupos', 'handleSaveGrupo', 'reloadConfirmacoes', 'handleDownloadCsv')
$foundFunctions = 0

foreach ($func in $requiredFunctions) {
    if ($jsContent -match "function $func|const $func") {
        $foundFunctions++
    }
}

if ($foundFunctions -eq 5) {
    Write-Status "dashboard.js contem funcoes principais" 'OK'
    $passedTests++
} else {
    Write-Status "dashboard.js faltam funcoes ($foundFunctions/5)" 'FAIL'
}

# ============================================================
# RESUMO FINAL
# ============================================================

$percentual = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "`n========================================================`n" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES`n" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

Write-Host "Resultado: $passedTests/$totalTests testes passaram ($percentual%)`n"

if ($percentual -eq 100) {
    Write-Host "[OK] EXCELENTE! Tudo esta pronto para o proximo passo." -ForegroundColor Green
    Write-Host "`nProximos passos recomendados:" -ForegroundColor Green
    Write-Host "  1. Testar interface HTML localmente (abrir dashboard.html)" -ForegroundColor Green
    Write-Host "  2. Verificar tabelas no Supabase" -ForegroundColor Green
    Write-Host "  3. Criar dados de teste" -ForegroundColor Green
    Write-Host "  4. Fazer deploy para Vercel" -ForegroundColor Green
} elseif ($percentual -ge 80) {
    Write-Host "[WARN] Alguns problemas foram encontrados. Revise os testes FAIL." -ForegroundColor Yellow
} else {
    Write-Host "[FAIL] Ha varios problemas. Revise a implementacao." -ForegroundColor Red
}

Write-Host "`n========================================================`n" -ForegroundColor Cyan
