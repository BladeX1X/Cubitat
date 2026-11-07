import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(
  resolve(process.cwd(), 'scripts/rotate-turnstile-secret.ps1'),
  'utf8',
);

describe('Turnstile secret rotation script security', () => {
  it('reads the Turnstile secret as hidden input and never takes it as an argument', () => {
    expect(script).toMatch(/Read-Host[^\r\n]*-AsSecureString/);
    expect(script).not.toMatch(/param\s*\([^)]*(?:secret|captcha)/is);
    expect(script).toContain('Marshal]::ZeroFreeBSTR');
  });

  it('targets only the configured shared Worker and the DEV and production Auth projects', () => {
    expect(script).toContain('turnstile-siteverify-cubitat');
    expect(script).toContain('bknwerqbbysveehcdmzr');
    expect(script).toContain('tohjzoncoosvjbjcakdl');
    expect(script).toContain('security_captcha_provider');
    expect(script).toContain('security_captcha_secret');
  });

  it('passes the secret to Wrangler through stdin and does not log provider errors or secret values', () => {
    expect(script).toMatch(/\$turnstileSecret\s*\|\s*&\s*\$wranglerPath/);
    expect(script).not.toMatch(/Write-(?:Host|Output|Error).*\$(?:turnstileSecret|plainSecret|body)/i);
    expect(script).not.toMatch(/(?:Out-File|Set-Content|Add-Content).*\$(?:turnstileSecret|plainSecret)/i);
    expect(script).toContain('No se muestran detalles de la respuesta para proteger credenciales.');
  });
});
