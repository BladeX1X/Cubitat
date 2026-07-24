param(
  [string]$ProjectRef = "tohjzoncoosvjbjcakdl",
  [string]$SenderEmail = "notificaciones@cubitathome.com"
)

$secureKey = Read-Host "Pega RESEND_API_KEY para configurar SMTP en Supabase" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

  $env:RESEND_API_KEY = $apiKey
  $env:SUPABASE_SMTP_ADMIN_EMAIL = $SenderEmail

  Write-Host ""
  Write-Host "Configurando Supabase Auth SMTP con Resend..." -ForegroundColor Cyan
  Write-Host "Project ref: $ProjectRef"
  Write-Host "Sender email: $SenderEmail"
  Write-Host ""

  supabase config push --project-ref $ProjectRef --yes

  if ($LASTEXITCODE -ne 0) {
    throw "supabase config push fallo con codigo $LASTEXITCODE"
  }

  Write-Host ""
  Write-Host "Configuracion enviada. Ahora prueba registro o recuperacion desde Cubitat." -ForegroundColor Green
}
finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }

  Remove-Item Env:\RESEND_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\SUPABASE_SMTP_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Variable apiKey -ErrorAction SilentlyContinue
}
