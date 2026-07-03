param(
  [string]$To = "pochiprats18@gmail.com",
  [string]$From = "onboarding@resend.dev",
  [string]$Subject = "Cubitat prueba de confirmacion"
)

$secureKey = Read-Host "Pega RESEND_API_KEY para esta prueba temporal" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

  $body = @{
    from = $From
    to = @($To)
    subject = $Subject
    html = @"
<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
  <h1 style="font-size: 20px;">Prueba de correo Cubitat</h1>
  <p>Este es un envio limitado usando Resend antes de verificar dominio.</p>
  <p>Cuando el dominio este verificado, Supabase Auth usara el remitente oficial de Cubitat.</p>
</div>
"@
  } | ConvertTo-Json -Depth 5

  Invoke-RestMethod `
    -Uri "https://api.resend.com/emails" `
    -Method Post `
    -Headers @{
      Authorization = "Bearer $apiKey"
      "Content-Type" = "application/json"
    } `
    -Body $body
}
finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  Remove-Variable apiKey -ErrorAction SilentlyContinue
}
