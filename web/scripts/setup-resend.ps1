param(
  [string]$Profile = "default"
)

$ErrorActionPreference = "Stop"

Write-Host "Cubitat / Resend setup" -ForegroundColor Cyan
Write-Host "Pega la API key de Resend cuando se solicite. No se imprimira en pantalla."

$secure = Read-Host -AsSecureString "RESEND_API_KEY"
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

  if ([string]::IsNullOrWhiteSpace($key) -or -not $key.StartsWith("re_")) {
    throw "La API key debe empezar con re_"
  }

  npx --yes resend-cli@latest login --key $key --profile $Profile
  npx --yes resend-cli@latest doctor --profile $Profile
}
finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
