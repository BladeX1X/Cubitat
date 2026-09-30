import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const configPath = fileURLToPath(new URL('../supabase/config.toml', import.meta.url))
const workerConfigPath = fileURLToPath(new URL('../wrangler.phase2-dev.jsonc', import.meta.url))
const config = await readFile(configPath, 'utf8')
const workerConfig = await readFile(workerConfigPath, 'utf8')
const devOrigin = 'https://cubitat1-phase2-dev.pochiprats18.workers.dev'

const requiredValues = [
  `site_url = "${devOrigin}"`,
  `"${devOrigin}/auth/callback*"`,
  `"${devOrigin}/recuperar-contrasena"`,
  '"https://cubitathome.com/auth/callback"',
  '"https://cubitathome.com/recuperar-contrasena"',
  'otp_expiry = 900',
  '[auth.captcha]',
  'enabled = true',
  'provider = "turnstile"',
  'secret = "env(SUPABASE_AUTH_CAPTCHA_SECRET)"',
  'pass = "env(RESEND_API_KEY)"',
  '[auth.external.google]',
  'secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"',
]

const missingValues = requiredValues.filter((value) => !config.includes(value))
if (missingValues.length > 0) {
  throw new Error(`Configuracion Auth DEV incompleta o insegura: ${missingValues.join(', ')}`)
}

if (config.includes('site_url = "https://cubitathome.com"')) {
  throw new Error('La configuracion Auth DEV no puede usar el site_url productivo')
}

if (!workerConfig.includes(`"PUBLIC_SITE_URL": "${devOrigin}"`)) {
  throw new Error('La configuracion Worker DEV debe usar PUBLIC_SITE_URL del entorno DEV')
}

if (!workerConfig.includes('"ALERT_EMAIL_FROM": "Cubitat DEV <onboarding@resend.dev>"')) {
  throw new Error('La configuracion Worker DEV debe usar un remitente de correo no productivo')
}

console.log('Verified: Supabase Auth and Worker DEV configs preserve DEV origin, redirects, recovery expiry and email sender')
