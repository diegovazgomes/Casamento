#!/usr/bin/env pwsh
<#
.SYNOPSIS
Script de validação rápida do Dashboard — verifica estrutura, arquivos e configuração

.DESCRIPTION
Executa uma série de testes para validar se o dashboard foi implementado corretamente.
Não requer servidor rodando — testa apenas arquivos e estrutura local.

.EXAMPLE
./test-dashboard.ps1

.NOTES
Executar na raiz do projeto (C:\Users\Latitude 5490\Desktop\Casamento)
#>

param(
    [switch]$Verbose = $false,
    [switch]$ShowDetails = $false
)

# Cores
$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Warning = 'Yellow'
    Info    = 'Cyan'
    Reset   = 'White'
}

function Write-Status {
    param([string]$Message, [string]$Status)
    $symbol = if ($Status -eq 'OK') { '✅' } elseif ($Status -eq 'FAIL') { '❌' } else { '⚠️' }
    $color = if ($Status -eq 'OK') { $colors.Success } elseif ($Status -eq 'FAIL') { $colors.Error } else { $colors.Warning }
    
    Write-Host "$symbol $Message" -ForegroundColor $color
}

function Test-File {
    param([string]$Path, [string]$Description)
    $exists = Test-Path $Path
    $status = if ($exists) { 'OK' } else { 'FAIL' }
    Write-Status "$Description" $status
    
    if ($ShowDetails -and $exists) {
        $lines = (Get-Content $Path | Measure-Object -Line).Lines
        Write-Host "   📄 Linhas: $lines" -ForegroundColor Gray
    }
    
    return $exists
}

function Test-JsonProperty {
    param([string]$JsonPath, [string[]]$Properties, [string]$Description)
    
    try {
        $json = Get-Content $JsonPath -Raw | ConvertFrom-Json
        $allFound = $true
        $missingProps = @()
        
        foreach ($prop in $Properties) {
            $value = $json
            foreach ($part in $prop.Split('.')) {
                $value = $value.$part
            }
            
            if ($null -eq $value) {
                $allFound = $false
                $missingProps += $prop
            }
        }
        
        $status = if ($allFound) { 'OK' } else { 'FAIL' }
        Write-Status "$Description" $status
        
        if ($missingProps.Count -gt 0) {
            Write-Host "   ⚠️  Propriedades faltando: $($missingProps -join ', ')" -ForegroundColor Yellow
        }
        
        return $allFound
    }
    catch {
        Write-Status "$Description" 'FAIL'
        Write-Host "   ❌ Erro ao ler JSON: $_" -ForegroundColor Red
        return $false
    }
}

function Test-JsonValidation {
    param([string]$Path, [string]$Description)
    
    try {
        $json = Get-Content $Path -Raw | ConvertFrom-Json
        Write-Status "$Description (JSON válido)" 'OK'
        return $true
    }
    catch {
        Write-Status "$Description (JSON inválido)" 'FAIL'
        Write-Host "   ❌ Erro: $_" -ForegroundColor Red
        return $false
    }
}

# ============================================================
# INÍCIO DOS TESTES
# ============================================================

Clear-Host
Write-Host "
╔═════════════════════════════════════════════════════════╗
║   Validação do Dashboard — Fase 1 (21/04/2026)         ║
╚═════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$passedTests = 0
$totalTests = 0

# ============================================================
# 1. ESTRUTURA DE ARQUIVOS
# ============================================================

Write-Host "`n📁 TESTE 1: Estrutura de Arquivos`n" -ForegroundColor Cyan

$files = @(
    @{ Path = "dashboard.html"; Desc = "Página HTML do dashboard" },
    @{ Path = "assets/js/dashboard.js"; Desc = "Lógica JavaScript do dashboard" },
    @{ Path = "api/dashboard/auth.js"; Desc = "Endpoint de autenticação" },
    @{ Path = "api/dashboard/guest-groups.js"; Desc = "CRUD de grupos" },
    @{ Path = "api/dashboard/confirmations.js"; Desc = "Listagem e export de confirmações" },
    @{ Path = "api/dashboard/reminders.js"; Desc = "Endpoint de lembretes" },
    @{ Path = "tests/integration/dashboard.integration.test.js"; Desc = "Testes de integração" }
)

foreach ($file in $files) {
    $totalTests++
    if (Test-File -Path $file.Path -Description $file.Desc) {
        $passedTests++
    }
}

# ============================================================
# 2. VALIDAÇÃO DE JSON
# ============================================================

Write-Host "`n📋 TESTE 2: Validação de JSON`n" -ForegroundColor Cyan

# site.json
$totalTests++
if (Test-JsonValidation -Path "assets/config/site.json" -Description "site.json") {
    $passedTests++
}

# schemas
$totalTests++
if (Test-JsonValidation -Path "assets/config/schemas/site-schema.json" -Description "site-schema.json") {
    $passedTests++
}

# ============================================================
# 3. CONFIGURAÇÃO DO DASHBOARD
# ============================================================

Write-Host "`n⚙️  TESTE 3: Configuração do Dashboard`n" -ForegroundColor Cyan

$totalTests++
if (Test-JsonProperty -Path "assets/config/site.json" -Properties @('dashboard', 'dashboard.enabled', 'dashboard.eventId', 'dashboard.reminderTemplates') -Description "Bloco 'dashboard' em site.json") {
    $passedTests++
}

# ============================================================
# 4. SCHEMA VALIDAÇÃO
# ============================================================

Write-Host "`n✔️  TESTE 4: Schema de Validação`n" -ForegroundColor Cyan

$totalTests++
$schemaContent = Get-Content "assets/config/schemas/site-schema.json" -Raw
if ($schemaContent -match '"dashboard"') {
    Write-Status "Schema contém 'dashboard'" 'OK'
    $passedTests++
} else {
    Write-Status "Schema contém 'dashboard'" 'FAIL'
}

# ============================================================
# 5. BANCO DE DADOS
# ============================================================

Write-Host "`n🗄️  TESTE 5: Schema Supabase`n" -ForegroundColor Cyan

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
# 6. TESTES UNITÁRIOS
# ============================================================

Write-Host "`n🧪 TESTE 6: Suite de Testes`n" -ForegroundColor Cyan

$totalTests++
$testFileContent = Get-Content "tests/integration/dashboard.integration.test.js" -Raw
if ($testFileContent -match 'describe.*Dashboard' -and $testFileContent -match 'it\(' ) {
    Write-Status "Arquivo de testes possui estrutura válida" 'OK'
    $passedTests++
} else {
    Write-Status "Arquivo de testes incompleto" 'FAIL'
}

# ============================================================
# 7. VARIÁVEIS DE AMBIENTE
# ============================================================

Write-Host "`n🔑 TESTE 7: Variáveis de Ambiente`n" -ForegroundColor Cyan

$envFileExists = Test-Path ".env.local"
$totalTests++

if ($envFileExists) {
    Write-Status "Arquivo .env.local existe" 'OK'
    $passedTests++
    
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match 'SUPABASE_URL' -and $envContent -match 'DASHBOARD_PASSWORD') {
        Write-Status "Variáveis obrigatórias configuradas" 'OK'
    } else {
        Write-Status "Faltam variáveis: SUPABASE_URL ou DASHBOARD_PASSWORD" 'FAIL'
    }
} else {
    Write-Status "Arquivo .env.local não encontrado (não crítico)" 'FAIL'
    Write-Host "   💡 Crie .env.local na raiz com SUPABASE_URL e DASHBOARD_PASSWORD" -ForegroundColor Yellow
}

# ============================================================
# 8. VALIDAÇÃO DE CONTEÚDO
# ============================================================

Write-Host "`n📝 TESTE 8: Validação de Conteúdo`n" -ForegroundColor Cyan

# Verificar se dashboard.html contém elementos principais
$totalTests++
$dashboardContent = Get-Content "dashboard.html" -Raw
$requiredElements = @('id="authScreen"', 'id="dashboardScreen"', 'id="gruposBody"', 'id="modalGrupo"')
$foundElements = 0

foreach ($elem in $requiredElements) {
    if ($dashboardContent -match [regex]::Escape($elem)) {
        $foundElements++
    }
}

if ($foundElements -eq 4) {
    Write-Status "dashboard.html contém elementos principais" 'OK'
    $passedTests++
} else {
    Write-Status "dashboard.html faltam elementos ($foundElements/4)" 'FAIL'
}

# Verificar se dashboard.js contém funções principais
$totalTests++
$jsContent = Get-Content "assets/js/dashboard.js" -Raw
$requiredFunctions = @('handleAuth', 'loadGrupos', 'handleSaveGrupo', 'reloadConfirmacoes', 'handleDownloadCsv')
$foundFunctions = 0

foreach ($func in $requiredFunctions) {
    if ($jsContent -match "function $func|async function $func|const $func") {
        $foundFunctions++
    }
}

if ($foundFunctions -eq 5) {
    Write-Status "dashboard.js contém funções principais" 'OK'
    $passedTests++
} else {
    Write-Status "dashboard.js faltam funções ($foundFunctions/5)" 'FAIL'
}

# ============================================================
# RESUMO FINAL
# ============================================================

$percentual = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "`n
╔═════════════════════════════════════════════════════════╗
║   RESUMO DOS TESTES                                    ║
╚═════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "`n📊 Resultado: $passedTests/$totalTests testes passaram ($percentual%)
"

if ($percentual -eq 100) {
    Write-Host "✅ EXCELENTE! Tudo está pronto para o próximo passo." -ForegroundColor Green
    Write-Host "`nPróximos passos recomendados:
  1. Testar interface HTML localmente (abrir dashboard.html)
  2. Verificar tabelas no Supabase
  3. Criar dados de teste
  4. Fazer deploy para Vercel
" -ForegroundColor Green
} elseif ($percentual -ge 80) {
    Write-Host "⚠️  Alguns problemas foram encontrados. Revise os testes FAIL." -ForegroundColor Yellow
} else {
    Write-Host "❌ Há vários problemas. Revise a implementação." -ForegroundColor Red
}

Write-Host "`n"

# Retornar status
exit if ($percentual -eq 100) { 0 } else { 1 }
