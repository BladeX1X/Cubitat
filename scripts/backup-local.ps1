# Script de Backup Local de un Clic para la base de datos de Cubitat
# Requiere tener instalado PostgreSQL CLI (pg_dump) localmente en su sistema.

$dateStr = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $PSScriptRoot "../backups"
$backupFile = Join-Path $backupDir "cubitat-backup-$dateStr.sql"

# Crear directorio de backups si no existe
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

Write-Host "=============================================" -ForegroundColor Green
Write-Host "   CUBITAT - GENERADOR DE BACKUPS LOCALES    " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Configuración del servidor Supabase
$hostName = "aws-0-us-west-1.pooler.supabase.com" # Host del Connection Pooler (Transaction / Session port 6543 o 5432)
$dbName = "postgres"
$userName = "postgres.tohjzoncoosvjbjcakdl" # Nombre de usuario del proyecto Supabase

Write-Host "Destino del respaldo: $backupFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Introduce la contraseña de la Base de Datos de Supabase:" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal::SecureStringToBSTR($password)]
$plainPassword = [System.Runtime.InteropServices.Marshal::PtrToStringAuto($bstr)]

# Establecer variable de entorno para pg_dump de forma temporal
$env:PGPASSWORD = $plainPassword

Write-Host "Iniciando descarga de base de datos..." -ForegroundColor Yellow

# Ejecutar pg_dump
& pg_dump -h $hostName -p 5432 -U $userName -F p -b -v -f $backupFile $dbName 2>$null

# Validar resultado
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "¡Respaldo completado con éxito!" -ForegroundColor Green
    Write-Host "Archivo guardado en: $backupFile" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR: Ocurrió un fallo al exportar la base de datos." -ForegroundColor Red
    Write-Host "Asegúrese de que la contraseña sea correcta y de tener instalado pg_dump (PostgreSQL CLI)." -ForegroundColor Red
}

# Limpiar contraseña de memoria
$env:PGPASSWORD = $null
$plainPassword = $null
