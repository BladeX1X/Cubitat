[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$supabaseProjects = @(
    @{ Label = 'Supabase DEV Auth'; Ref = 'bknwerqbbysveehcdmzr' },
    @{ Label = 'Supabase producción Auth'; Ref = 'tohjzoncoosvjbjcakdl' }
)
$workerName = 'turnstile-siteverify-cubitat'
$workerBinding = 'TURNSTILE_SECRET_KEY'
$results = [System.Collections.Generic.List[object]]::new()
$turnstileSecret = $null
$secretBstr = [IntPtr]::Zero

try {
    $supabaseAccessToken = [Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'Process')
    if ([string]::IsNullOrWhiteSpace($supabaseAccessToken)) {
        throw 'Falta SUPABASE_ACCESS_TOKEN. Configura previamente un token personal de Supabase con permisos para editar Auth en ambos proyectos.'
    }

    $wranglerCommand = Get-Command 'wrangler.cmd' -ErrorAction SilentlyContinue
    if ($wranglerCommand) {
        $wranglerPath = $wranglerCommand.Source
    }
    else {
        $localWrangler = Join-Path $PSScriptRoot '..\node_modules\.bin\wrangler.cmd'
        if (Test-Path -LiteralPath $localWrangler) {
            $wranglerPath = (Resolve-Path -LiteralPath $localWrangler).Path
        }
        else {
            throw 'No encuentro wrangler.cmd. Instala las dependencias de web o inicia sesión con Wrangler y vuelve a ejecutar el script.'
        }
    }

    # Validate the existing Cloudflare CLI session before requesting the new secret.
    $null = & $wranglerPath whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'Wrangler no tiene una sesión válida. Ejecuta wrangler login y vuelve a intentar.'
    }

    Write-Host 'El secreto nuevo se solicitará oculto y se sincronizará a 3 destinos.'
    $secureTurnstileSecret = Read-Host 'Nuevo secreto Turnstile' -AsSecureString
    if ($null -eq $secureTurnstileSecret -or $secureTurnstileSecret.Length -eq 0) {
        throw 'El secreto Turnstile no puede estar vacío.'
    }

    $secretBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureTurnstileSecret)
    $turnstileSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretBstr)
    if ([string]::IsNullOrWhiteSpace($turnstileSecret)) {
        throw 'El secreto Turnstile no puede estar vacío.'
    }

    foreach ($project in $supabaseProjects) {
        $uri = "https://api.supabase.com/v1/projects/$($project.Ref)/config/auth"
        $payload = @{
            security_captcha_enabled  = $true
            security_captcha_provider = 'turnstile'
            security_captcha_secret   = $turnstileSecret
        } | ConvertTo-Json -Compress

        try {
            $null = Invoke-RestMethod -Uri $uri -Method Patch `
                -Headers @{ Authorization = "Bearer $supabaseAccessToken" } `
                -ContentType 'application/json' `
                -Body $payload `
                -TimeoutSec 30 `
                -ErrorAction Stop
            $results.Add([pscustomobject]@{ Target = $project.Label; Success = $true })
        }
        catch {
            # Deliberately do not print the provider exception or response body.
            $results.Add([pscustomobject]@{ Target = $project.Label; Success = $false })
        }
        finally {
            $payload = $null
            $uri = $null
        }
    }

    # Wrangler reads the value from stdin; it is never added to its command line.
    $null = $turnstileSecret | & $wranglerPath secret put $workerBinding --name $workerName 2>&1
    $workerSucceeded = ($LASTEXITCODE -eq 0)
    $results.Add([pscustomobject]@{ Target = "Cloudflare Worker $workerName"; Success = $workerSucceeded })

    Write-Host ''
    Write-Host 'Resultado de sincronización (el secreto no se muestra):'
    foreach ($result in $results) {
        if ($result.Success) {
            Write-Host "  OK   $($result.Target)"
        }
        else {
            Write-Host "  ERROR $($result.Target). No se muestran detalles de la respuesta para proteger credenciales."
        }
    }

    if (@($results | Where-Object { -not $_.Success }).Count -gt 0) {
        Write-Error 'La rotación quedó incompleta. Corrige el acceso del destino indicado y vuelve a ejecutar el script con el mismo secreto nuevo.'
        exit 1
    }

    Write-Host ''
    Write-Host 'Los 3 destinos recibieron el secreto. Verifica login, registro y recuperación de contraseña en DEV y producción.'
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    if ($secretBstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretBstr)
    }
    $turnstileSecret = $null
    $supabaseAccessToken = $null
    $secureTurnstileSecret = $null
    $payload = $null
}
