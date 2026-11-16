import { RateLimiter } from './rate-limiter';
import {
  handlePublicContactSubmission,
  handlePublicMarketplaceContact,
  handlePublicPropertyContact,
  handlePublicReportSubmission,
  verifyTurnstile,
  type PublicSubmissionEnv,
} from './worker/public-submissions';
import { checkPwnedPassword, shouldCheckPwnedPassword } from './modules/auth/pwnedPassword';
import { logWorkerEvent } from './worker/logger';
import { readBoundedBytes, readBoundedJsonObject, readBoundedText } from './worker/boundedJson.js';
import { handlePropertyImageUpload } from './worker/property-image-uploads';
import {
  dispatchPendingPushNotifications,
  handlePushSubscriptionRequest,
  type PushNotificationEnv,
} from './worker/push-notifications';
import {
  moderatePropertyWithAi,
  type AiModerationRequest,
} from './worker/ai-moderation';

export { RateLimiter };

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface RateLimiterStub {
  fetch(input: string | URL | Request): Promise<Response>;
}

interface RateLimiterNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): RateLimiterStub;
}

export interface Env extends PublicSubmissionEnv, PushNotificationEnv {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  PHASE2_ENABLED?: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  SUPABASE_MANAGEMENT_TOKEN?: string;
  SUPABASE_PROJECT_ID?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  ALERT_EMAIL_FROM?: string;
  PUBLIC_SITE_URL?: string;
  GA_SERVICE_ACCOUNT_JSON?: string;
  GA_PROPERTY_ID?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  VAPID_SUBJECT?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  TURNSTILE_VERIFY_URL?: string;
  RATE_LIMITER: RateLimiterNamespace;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AI_MODERATION_REQUEST_BYTES = 8 * 1024 * 1024;
const DEFAULT_SUPABASE_PROXY_BODY_LIMIT_BYTES = 64 * 1024;

export function getSupabaseProxyBodyLimit(subPath: string, method: string): number {
  if ((method === 'POST' || method === 'PUT') && subPath.startsWith('/storage/v1/object/')) {
    const bucket = subPath.match(/^\/storage\/v1\/object\/(?:public\/|authenticated\/)?([^/?]+)/)?.[1];
    if (bucket === 'property_images') return 5 * 1024 * 1024;
    if (bucket === 'avatars') return 1024 * 1024;
    if (bucket === 'kyc_documents' || bucket === 'property_documents') return 10 * 1024 * 1024;
  }
  return DEFAULT_SUPABASE_PROXY_BODY_LIMIT_BYTES;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getConfirmedAt(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const confirmedAt = value.email_confirmed_at ?? value.confirmed_at;
  return typeof confirmedAt === 'string' ? confirmedAt : null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return withSecurityHeaders(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));
}

const PRIVATE_ROUTE_PREFIXES = [
  '/auth/callback',
  '/editar/',
  '/favoritos',
  '/mi-cuenta',
  '/mis-propiedades',
  '/moderar',
  '/panel-agente',
  '/publicar',
  '/recuperar-contrasena',
]

function shouldDisallowIndexing(url?: URL): boolean {
  if (!url) return false

  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (!isLocal && url.hostname !== 'cubitathome.com') return true

  return PRIVATE_ROUTE_PREFIXES.some((route) => {
    const baseRoute = route.endsWith('/') ? route.slice(0, -1) : route
    return url.pathname === baseRoute || url.pathname.startsWith(`${baseRoute}/`)
  })
}

function canonicalUrl(url: URL): string {
  return `${url.origin}${url.pathname}`
}

async function rewriteCanonicalLink(
  response: Response,
  url: URL,
  indexable = !shouldDisallowIndexing(url),
): Promise<Response> {
  if (!response.headers.get('Content-Type')?.includes('text/html')) return response

  const canonicalPattern = /<link\b[^>]*rel=["']canonical["'][^>]*>/i
  const html = await response.text()
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl(url)}" />`
  const body = indexable
    ? canonicalPattern.test(html)
      ? html.replace(canonicalPattern, canonicalTag)
      : html.replace('</head>', `${canonicalTag}</head>`)
    : html.replace(canonicalPattern, '')

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

function withSecurityHeaders(
  response: Response,
  url?: URL,
  forceNoIndex = false,
  supabaseUrl = '',
): Response {
  if (response.status === 101) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  if (forceNoIndex || shouldDisallowIndexing(url)) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  if (response.headers.get('Content-Type')?.includes('text/html')) {
    const normalizedSupabaseUrl = supabaseUrl.replace(/\/+$/, '');
    headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self' 'sha256-OeFuuJVJqKusoFUuJIcP1aWwNUC9Redatv1bcLOinY4=' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://challenges.cloudflare.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${normalizedSupabaseUrl} https://www.google-analytics.com https://www.google.com https://static.cloudflareinsights.com https://*.cubitathome.com https://tiles.openfreemap.org https://challenges.cloudflare.com https://*.workers.dev; frame-src 'self' https://www.google.com https://www.openstreetmap.org https://challenges.cloudflare.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function getAuthenticatedUser(authHeader: string, env: Env): Promise<{ id: string } | null> {
  if (!authHeader.startsWith('Bearer ') || authHeader === 'Bearer dummy-key-safe-from-browsers') {
    return null;
  }

  const response = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': env.VITE_SUPABASE_ANON_KEY,
      'Authorization': authHeader
    }
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id } : null;
}

async function getUserRole(userId: string, authHeader: string, env: Env): Promise<string | null> {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`,
    {
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': authHeader
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const rows = await response.json() as { role?: string }[];
  return rows[0]?.role || null;
}

function getJwtAssuranceLevel(authHeader: string): string | null {
  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const claims = JSON.parse(atob(padded)) as { aal?: unknown };
    return typeof claims.aal === 'string' ? claims.aal : null;
  } catch {
    return null;
  }
}

function hasAdminSecondFactor(authHeader: string): boolean {
  return getJwtAssuranceLevel(authHeader) === 'aal2';
}

async function hasActiveAdminMfaBypass(authHeader: string, env: Env): Promise<boolean> {
  try {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/get_admin_mfa_bypass_until`, {
      method: 'POST',
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!response.ok) return false;
    const expiresAt: unknown = await response.json();
    return typeof expiresAt === 'string' && Date.parse(expiresAt) > Date.now();
  } catch {
    return false;
  }
}

async function canAdminUseSensitiveFeatures(authHeader: string, env: Env): Promise<boolean> {
  return hasAdminSecondFactor(authHeader) || hasActiveAdminMfaBypass(authHeader, env);
}

async function canModerateProperty(propertyId: string, userId: string, authHeader: string, env: Env): Promise<boolean> {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=id,user_id`,
    {
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': authHeader
      }
    }
  );

  if (!response.ok) {
    return false;
  }

  const rows = await response.json() as { user_id?: string }[];
  const property = rows[0];
  if (!property) {
    return false;
  }

  if (property.user_id === userId) {
    return true;
  }

  return (await getUserRole(userId, authHeader, env)) === 'admin'
    && await canAdminUseSensitiveFeatures(authHeader, env);
}

async function isRateLimited(
  env: Env,
  ip: string,
  limit: number,
  windowMs: number,
  reservationId?: string,
): Promise<boolean> {
  const id = env.RATE_LIMITER.idFromName('global');
  const stub = env.RATE_LIMITER.get(id);
  const reservation = reservationId ? `&reservationId=${encodeURIComponent(reservationId)}` : '';
  const url = `https://dummy/check?key=${encodeURIComponent(ip)}&limit=${limit}&windowMs=${windowMs}${reservation}`;
  const res = await stub.fetch(url);
  const data = await res.json() as { allowed: boolean };
  return !data.allowed;
}

async function releaseRateLimitReservation(env: Env, key: string, reservationId: string): Promise<boolean> {
  const id = env.RATE_LIMITER.idFromName('global');
  const stub = env.RATE_LIMITER.get(id);
  const url = `https://dummy/check?key=${encodeURIComponent(key)}&operation=release&reservationId=${encodeURIComponent(reservationId)}`;
  const response = await stub.fetch(url);
  if (!response.ok) return false;
  const result = await response.json() as { released?: boolean };
  return result.released === true;
}

export async function checkRateLimit(env: Env, key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const id = env.RATE_LIMITER.idFromName('global');
  const stub = env.RATE_LIMITER.get(id);
  const url = `https://dummy/check?key=${encodeURIComponent(key)}&limit=${limit}&windowMs=${windowMs}`;
  const res = await stub.fetch(url);
  return await res.json() as { allowed: boolean; remaining: number; resetAt: number };
}

export function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return withSecurityHeaders(new Response(JSON.stringify({
    error: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  }));
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getRequestEmail(request: Request): Promise<{ email: string; status?: 408 | 413 }> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const parsed = await readBoundedJsonObject(request.clone(), 16 * 1024);
    if (!parsed.ok) return parsed.status === 408 || parsed.status === 413 ? { email: '', status: parsed.status } : { email: '' };
    const body = parsed.value;
    const nestedData = isRecord(body.data) ? body.data : null;
    const nestedUser = isRecord(body.user) ? body.user : null;
    return { email: normalizeEmail(body.email || nestedData?.email || nestedUser?.email) };
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const parsed = await readBoundedText(request.clone(), 16 * 1024);
    if (!parsed.ok) return parsed.status === 408 || parsed.status === 413 ? { email: '', status: parsed.status } : { email: '' };
    return { email: normalizeEmail(new URLSearchParams(parsed.value).get('email')) };
  }

  return { email: '' };
}

async function enforceAuthRateLimit(request: Request, env: Env, clientIp: string, subPath: string): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const isPasswordToken = method === 'POST'
    && subPath.startsWith('/auth/v1/token')
    && url.searchParams.get('grant_type') === 'password';
  const isSignup = method === 'POST' && subPath === '/auth/v1/signup';
  const isRecover = method === 'POST' && subPath === '/auth/v1/recover';
  const isOtp = method === 'POST' && subPath === '/auth/v1/otp';
  const isResend = method === 'POST' && subPath === '/auth/v1/resend';

  if (!isPasswordToken && !isSignup && !isRecover && !isOtp && !isResend) {
    return null;
  }

  let action: 'login' | 'signup' | 'recover' | 'resend' | 'otp' = 'login';
  let ipLimit = 20;
  let ipWindowMs = 60000;
  let emailLimit = 8;
  let emailWindowMs = 600000;

  if (isPasswordToken) {
    action = 'login';
    ipLimit = 10;
    ipWindowMs = 60000;
    emailLimit = 6;
    emailWindowMs = 600000;
  } else if (isSignup) {
    action = 'signup';
    ipLimit = 5;
    ipWindowMs = 600000;
    emailLimit = 3;
    emailWindowMs = 3600000;
  } else if (isRecover || isResend || isOtp) {
    action = isRecover ? 'recover' : isResend ? 'resend' : 'otp';
    ipLimit = 5;
    ipWindowMs = 600000;
    emailLimit = 3;
    emailWindowMs = 3600000;
  }

  const ipCheck = await checkRateLimit(env, `${clientIp}:auth:${action}:ip:v1`, ipLimit, ipWindowMs);
  if (!ipCheck.allowed) {
    logWorkerEvent('info', 'auth_rate_limit_blocked', { action, dimension: 'ip' });
    return rateLimitResponse(ipCheck.resetAt);
  }

  const requestEmail = await getRequestEmail(request);
  if (requestEmail.status === 408) return jsonResponse({ error: 'Request body timed out' }, 408);
  if (requestEmail.status === 413) return jsonResponse({ error: 'Payload too large' }, 413);
  const email = requestEmail.email;
  if (email) {
    const emailHash = await sha256Hex(email);
    const emailCheck = await checkRateLimit(env, `email:${emailHash}:auth:${action}:v1`, emailLimit, emailWindowMs);
    if (!emailCheck.allowed) {
      logWorkerEvent('info', 'auth_rate_limit_blocked', { action, dimension: 'email' });
      return rateLimitResponse(emailCheck.resetAt);
    }
  }

  return null;
}

function extractIdFromSlug(slug: string): string {
  if (!slug) return ''
  const parts = slug.split('-')
  if (parts.length >= 5) {
    const uuidCandidate = parts.slice(-5).join('-')
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(uuidCandidate)) {
      return uuidCandidate
    }
  }
  return slug
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hashRateLimitEmail(email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  token_uri?: string;
};

function encodeBase64Url(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePrivateKey(privateKey: string): ArrayBuffer {
  const normalized = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

async function createGoogleAccessToken(credentials: GoogleServiceAccountCredentials): Promise<string> {
  const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', ...(credentials.private_key_id ? { kid: credentials.private_key_id } : {}) };
  const claims = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
  const unsignedJwt = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodePrivateKey(credentials.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsignedJwt));
  const assertion = `${unsignedJwt}.${encodeBase64Url(new Uint8Array(signature))}`;

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth rechazó la autenticación (${response.status}).`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error('Google OAuth no devolvió un token de acceso.');
  return payload.access_token;
}

export async function fetchGoogleAnalyticsMetrics(env: Env): Promise<{ activeUsers: number | null; error: string }> {
  if (!env.GA_SERVICE_ACCOUNT_JSON || !env.GA_PROPERTY_ID) {
    return { activeUsers: null, error: 'Falta configurar Google Analytics.' };
  }

  try {
    const credentials = JSON.parse(env.GA_SERVICE_ACCOUNT_JSON) as Partial<GoogleServiceAccountCredentials>;
    if (!credentials.client_email || !credentials.private_key) {
      return { activeUsers: null, error: 'Las credenciales de Google Analytics no son válidas.' };
    }
    const accessToken = await createGoogleAccessToken(credentials as GoogleServiceAccountCredentials);
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(env.GA_PROPERTY_ID)}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }),
      },
    );
    if (!response.ok) {
      return { activeUsers: null, error: `Google Analytics no está disponible (${response.status}).` };
    }
    const payload = await response.json() as { rows?: Array<{ metricValues?: Array<{ value?: string }> }> };
    const value = Number(payload.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    return { activeUsers: Number.isFinite(value) ? value : null, error: '' };
  } catch {
    logWorkerEvent('warn', 'metrics_provider_failed', { source: 'google_analytics' });
    return { activeUsers: null, error: 'No fue posible consultar Google Analytics.' };
  }
}

async function getEmailConfirmedAt(email: string, env: Env): Promise<string | null> {
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data: unknown = await response.json();
        const users = isRecord(data) && Array.isArray(data.users)
          ? data.users
          : Array.isArray(data)
            ? data
            : [];
        const user = users.find((item) => isRecord(item) && normalizeEmail(item.email) === email) || users[0];
        return getConfirmedAt(user);
      }

      logWorkerEvent('warn', 'auth_user_lookup_failed', { source: 'service_role', status: response.status });
    } catch {
      logWorkerEvent('warn', 'auth_user_lookup_failed', { source: 'service_role' });
    }
  }

  if (!env.SUPABASE_MANAGEMENT_TOKEN || !env.SUPABASE_PROJECT_ID) {
    return null;
  }

  try {
    const safeEmail = email.replace(/'/g, "''");
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(env.SUPABASE_PROJECT_ID)}/database/query/read-only`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_MANAGEMENT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `select email_confirmed_at from auth.users where lower(email) = lower('${safeEmail}') order by created_at desc limit 1;`,
        }),
      }
    );

    if (!response.ok) {
      logWorkerEvent('warn', 'auth_user_lookup_failed', { source: 'management_api', status: response.status });
      return null;
    }

    const data: unknown = await response.json();
    const rows = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.result)
        ? data.result
        : isRecord(data) && Array.isArray(data.data)
          ? data.data
          : isRecord(data) && Array.isArray(data.rows)
            ? data.rows
            : isRecord(data) && isRecord(data.result) && Array.isArray(data.result.rows)
              ? data.result.rows
              : [];
    return getConfirmedAt(rows[0]);
  } catch {
    logWorkerEvent('warn', 'auth_user_lookup_failed', { source: 'management_api' });
    return null;
  }
}

async function sendAlreadyConfirmedEmail(email: string, env: Env): Promise<boolean> {
  const phase2Enabled = env.PHASE2_ENABLED === 'true';
  if (!env.RESEND_API_KEY || (phase2Enabled && !env.ALERT_EMAIL_FROM)) {
    logWorkerEvent('warn', 'transactional_email_skipped', {
      source: 'resend',
      reason: 'missing_configuration',
    });
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.ALERT_EMAIL_FROM || 'Cubitat <notificaciones@cubitathome.com>',
        to: [email],
        subject: 'Tu correo ya esta confirmado en Cubitat',
        html: `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f4f7f6;color:#10231f;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce6e2;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px;color:#60716e;font-size:16px;line-height:1.55;">
                <p style="margin:0 0 12px;color:#006b5d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Cubitat</p>
                <h1 style="margin:0 0 16px;color:#10231f;font-size:26px;line-height:1.15;">Tu correo ya esta confirmado</h1>
                <p style="margin:0 0 18px;">Recibimos una solicitud para reenviar la confirmacion, pero este correo ya esta confirmado en Cubitat.</p>
                <p style="margin:0 0 26px;">Puedes iniciar sesion con tu contrasena. Si no la recuerdas, usa la opcion de recuperar contrasena.</p>
                <p style="margin:0;font-size:13px;color:#8a9895;">Si no fuiste tu, puedes ignorar este mensaje.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      }),
    });

    if (!response.ok) {
      logWorkerEvent('warn', 'transactional_email_failed', {
        source: 'resend',
        status: response.status,
      });
      return false;
    }

    return true;
  } catch {
    logWorkerEvent('warn', 'transactional_email_failed', {
      source: 'resend',
      reason: 'network_unavailable',
    });
    return false;
  }
}

async function resendSignupConfirmation(
  email: string,
  turnstileToken: string,
  env: Env,
): Promise<'sent' | 'captcha-invalid' | 'unavailable'> {
  const phase2Enabled = env.PHASE2_ENABLED === 'true';
  if (
    !env.VITE_SUPABASE_URL
    || !env.VITE_SUPABASE_ANON_KEY
    || (phase2Enabled && !env.PUBLIC_SITE_URL)
  ) return 'unavailable';

  try {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/resend`, {
      method: 'POST',
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'signup',
        email,
        gotrue_meta_security: { captcha_token: turnstileToken },
        options: {
          email_redirect_to: `${(env.PUBLIC_SITE_URL || 'https://cubitathome.com').replace(/\/+$/, '')}/auth/callback`,
        },
      }),
    });
    if (response.ok) return 'sent';
    if (response.status === 400 || response.status === 422) {
      try {
        const payload: unknown = await response.clone().json();
        if (isRecord(payload) && payload.code === 'captcha_failed') return 'captcha-invalid';
      } catch {
        // Treat an unrecognized provider error as unavailable and keep it private.
      }
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export interface WorkerOptions {
  additionalPublicRpcs?: readonly string[];
  additionalAuthenticatedRpcs?: readonly string[];
  additionalAuthenticatedWriteTables?: readonly string[];
}

export function createWorker(options: WorkerOptions = {}) {
  return {
    async fetch(request: Request, env: Env, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    
    // Redirigir siempre de HTTP a HTTPS (solo en producción) y de www a la raíz para consolidar SEO
    let shouldRedirect = false;
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    if (proto === 'http' && !isLocal) {
      url.protocol = 'https:';
      shouldRedirect = true;
    }
    
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.replace('www.', '');
      shouldRedirect = true;
    }

    if (shouldRedirect) {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': url.toString()
        }
      });
    }

    const path = url.pathname;
    const addSecurityHeaders = (response: Response, forceNoIndex = false): Response => (
      withSecurityHeaders(response, url, forceNoIndex, env.VITE_SUPABASE_URL)
    );

    if (path === '/api/push/vapid-public-key') {
      if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
      if (!env.VAPID_PUBLIC_KEY) return jsonResponse({ error: 'Unavailable' }, 503);
      return withSecurityHeaders(jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY }), url);
    }

    if (path === '/api/push/subscription') {
      if (request.method !== 'PUT' && request.method !== 'DELETE' && request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }
      const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
      const pushRateLimit = await checkRateLimit(env, `${clientIp}:push-subscription:v1`, 30, 60_000);
      if (!pushRateLimit.allowed) return rateLimitResponse(pushRateLimit.resetAt);
      return withSecurityHeaders(await handlePushSubscriptionRequest(request, env), url);
    }

    if ((path === '/api/public/contact' || path === '/api/public/report') && request.method === 'POST') {
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const isContact = path === '/api/public/contact';
      const rateLimit = await checkRateLimit(
        env,
        `${clientIp}:public-submission:${isContact ? 'contact' : 'report'}:v1`,
        isContact ? 5 : 3,
        300000,
      );
      if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

      if (isContact) {
        return withSecurityHeaders(await handlePublicContactSubmission(request, env), url);
      }

      const authHeader = request.headers.get('Authorization') || '';
      let reporterId: string | null = null;
      if (authHeader) {
        const reporter = await getAuthenticatedUser(authHeader, env);
        if (!reporter) return jsonResponse({ error: 'Unauthorized' }, 401);
        reporterId = reporter.id;
      }

      return withSecurityHeaders(await handlePublicReportSubmission(request, env, reporterId), url);
    }

    if ((path === '/api/public/contact' || path === '/api/public/report') && request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (path === '/api/public/marketplace-contact') {
      if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const contactRateLimit = await checkRateLimit(env, `${clientIp}:public-marketplace-contact:v1`, 10, 10 * 60 * 1000);
      if (!contactRateLimit.allowed) return rateLimitResponse(contactRateLimit.resetAt);
      return withSecurityHeaders(await handlePublicMarketplaceContact(request, env), url);
    }

    if (path === '/api/public/property-contact') {
      if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const contactRateLimit = await checkRateLimit(env, `${clientIp}:public-property-contact:v1`, 10, 10 * 60 * 1000);
      if (!contactRateLimit.allowed) return rateLimitResponse(contactRateLimit.resetAt);
      return withSecurityHeaders(await handlePublicPropertyContact(request, env), url);
    }

    if (path === '/api/property-view') {
      if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const rateLimit = await checkRateLimit(env, `${clientIp}:property-view:v1`, 120, 60_000);
      if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

      const parsed = await readBoundedJsonObject<{ propertyId?: unknown }>(request, 1024);
      if (!parsed.ok) {
        const message = parsed.status === 413 ? 'Payload too large'
          : parsed.status === 408 ? 'Request body timed out' : 'Invalid request';
        return jsonResponse({ error: message }, parsed.status);
      }
      const propertyId = parsed.value.propertyId;
      if (typeof propertyId !== 'string' || !uuidRegex.test(propertyId)) {
        return jsonResponse({ error: 'Invalid property ID' }, 400);
      }
      if (!env.SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: 'Unavailable' }, 503);

      try {
        const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/increment_property_view_count`, {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ property_id: propertyId }),
        });
        if (!response.ok) {
          logWorkerEvent('warn', 'property_view_count_failed', { reason: 'fetch_http', status: response.status });
          return jsonResponse({ error: 'Unavailable' }, 503);
        }
        return jsonResponse({ ok: true });
      } catch {
        logWorkerEvent('warn', 'property_view_count_failed', { reason: 'network_unavailable' });
        return jsonResponse({ error: 'Unavailable' }, 503);
      }
    }

    if (path === '/api/property-images/upload') {
      if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
      const user = await getAuthenticatedUser(request.headers.get('Authorization') || '', env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
      const uploadRateLimit = await checkRateLimit(env, `user:${user.id}:property-image-upload:v1`, 30, 5 * 60_000);
      if (!uploadRateLimit.allowed) return rateLimitResponse(uploadRateLimit.resetAt);
      return addSecurityHeaders(await handlePropertyImageUpload(request, env, user.id));
    }

    // Endpoint interno para moderación con IA
    if (path === '/api/ai-moderate' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization') || '';
      const user = await getAuthenticatedUser(authHeader, env);
      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const moderationRateLimit = await checkRateLimit(
        env,
        `user:${user.id}:ai-moderation:v1`,
        5,
        10 * 60 * 1000,
      );
      if (!moderationRateLimit.allowed) {
        return rateLimitResponse(moderationRateLimit.resetAt);
      }

      const parsed = await readBoundedJsonObject<Partial<AiModerationRequest>>(
        request,
        MAX_AI_MODERATION_REQUEST_BYTES,
      );
      if (!parsed.ok) {
        const message = parsed.status === 413 ? 'Payload too large'
          : parsed.status === 408 ? 'Request body timed out'
            : 'Invalid JSON';
        return jsonResponse({ error: message }, parsed.status);
      }
      const moderationRequest = parsed.value;

      if (typeof moderationRequest.property_id !== 'string' || !uuidRegex.test(moderationRequest.property_id)) {
        return jsonResponse({ error: 'Invalid property_id' }, 400);
      }

      const allowed = await canModerateProperty(moderationRequest.property_id, user.id, authHeader, env);
      if (!allowed) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Ejecuta la moderación en segundo plano para mantener el endpoint rápido.
      ctx.waitUntil(moderatePropertyWithAi({
        property_id: moderationRequest.property_id,
        title: typeof moderationRequest.title === 'string' ? moderationRequest.title : undefined,
        location: typeof moderationRequest.location === 'string' ? moderationRequest.location : undefined,
        description: typeof moderationRequest.description === 'string' ? moderationRequest.description : undefined,
        price_usd: typeof moderationRequest.price_usd === 'string' || typeof moderationRequest.price_usd === 'number'
          ? moderationRequest.price_usd
          : undefined,
        property_type: typeof moderationRequest.property_type === 'string' ? moderationRequest.property_type : undefined,
        images: Array.isArray(moderationRequest.images) ? moderationRequest.images : undefined,
      }, env));

      return new Response(JSON.stringify({ status: 'processing', reason: 'Moderación iniciada en segundo plano.' }), { 
        status: 202, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Endpoint interno para obtener las métricas de plataformas usando APIs directamente
    if (path === '/api/metrics') {
      const authHeader = request.headers.get('Authorization') || '';
      const user = await getAuthenticatedUser(authHeader, env);
      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const role = await getUserRole(user.id, authHeader, env);
      if (role !== 'admin' || !await canAdminUseSensitiveFeatures(authHeader, env)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      const metricsRateLimit = await checkRateLimit(
        env,
        `user:${user.id}:admin-metrics:v1`,
        30,
        60 * 1000,
      );
      if (!metricsRateLimit.allowed) {
        return rateLimitResponse(metricsRateLimit.resetAt);
      }

      // 1. Fetch Cloudflare Metrics (si tenemos los tokens)
      let cloudflareData = { requests: null as number | null, error: 'Falta configurar CF_API_TOKEN y CF_ACCOUNT_ID' };
      if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID) {
        try {
          const date = new Date();
          const todayStr = date.toISOString().split('T')[0] + 'T00:00:00Z'; // Inicio del dia UTC
          const cfQuery = `
            query {
              viewer {
                accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
                  workersInvocationsAdaptive(limit: 10000, filter: {datetime_geq: "${todayStr}"}) {
                    sum { requests }
                  }
                }
              }
            }
          `;
          const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.CF_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: cfQuery })
          });
          if (!cfRes.ok) {
            throw new Error(`Cloudflare metrics HTTP ${cfRes.status}`);
          }
          const cfJson: unknown = await cfRes.json();
          const cfData = isRecord(cfJson) && isRecord(cfJson.data) ? cfJson.data : null;
          const viewer = cfData && isRecord(cfData.viewer) ? cfData.viewer : null;
          const accounts = viewer && Array.isArray(viewer.accounts) ? viewer.accounts : [];
          const firstAccount = isRecord(accounts[0]) ? accounts[0] : null;
          const invocations = firstAccount && Array.isArray(firstAccount.workersInvocationsAdaptive)
            ? firstAccount.workersInvocationsAdaptive
            : [];
          const firstInvocation = isRecord(invocations[0]) ? invocations[0] : null;
          const sum = firstInvocation && isRecord(firstInvocation.sum) ? firstInvocation.sum : null;
          const requests = sum?.requests;
          if (typeof requests === 'number' && Number.isFinite(requests)) {
            cloudflareData = { requests, error: '' };
          } else {
            const errors = isRecord(cfJson) && Array.isArray(cfJson.errors) ? cfJson.errors : [];
            const firstError = isRecord(errors[0]) ? errors[0] : null;
            const cfErr = typeof firstError?.message === 'string' ? firstError.message : 'Error desconocido';
            cloudflareData.error = `Error GraphQL CF: ${cfErr}`;
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Error desconocido';
          cloudflareData.error = `Excepción CF: ${message}`;
        }
      }

      // 2. Supabase API doesn't expose usage metrics publicly
      let supabaseData = { storage_bytes: null as number | null, egress_bytes: null as number | null, db_bytes: null as number | null, error: 'Falta configurar SUPABASE_MANAGEMENT_TOKEN y SUPABASE_PROJECT_ID' };
      if (env.SUPABASE_MANAGEMENT_TOKEN && env.SUPABASE_PROJECT_ID) {
        supabaseData = {
          db_bytes: null,
          storage_bytes: null,
          egress_bytes: null,
          error: 'Usa el dashboard de Supabase para ver el ancho de banda y storage real.'
        };
      }

      // 3. Google Analytics Data API (realtime users, read-only)
      const analyticsData = await fetchGoogleAnalyticsMetrics(env);
      const responseBody = {
        cloudflare: cloudflareData,
        supabase: supabaseData,
        analytics: analyticsData,
      };

      return new Response(JSON.stringify(responseBody), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/auth/resend-confirmation' && request.method === 'POST') {
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      try {
        if (await isRateLimited(env, `${clientIp}:resend-confirmation:ip:v1`, 5, 600000)) {
          logWorkerEvent('info', 'auth_resend_rate_limited');
          return jsonResponse({ ok: true });
        }
      } catch {
        logWorkerEvent('warn', 'auth_resend_unavailable');
        return jsonResponse({ error: 'La solicitud no está disponible temporalmente.' }, 503);
      }

      const parsed = await readBoundedJsonObject(request, 4 * 1024);
      if (!parsed.ok) {
        if (parsed.status === 408) return jsonResponse({ error: 'Request body timed out' }, 408);
        if (parsed.status === 413) return jsonResponse({ error: 'Payload too large' }, 413);
        return jsonResponse({ ok: true });
      }
      const body = parsed.value;

      const email = normalizeEmail(
        'email' in body
          ? body.email
          : undefined,
      );
      const tokenValue = 'turnstileToken' in body ? body.turnstileToken : undefined;
      const turnstileToken = typeof tokenValue === 'string' ? tokenValue.trim() : '';
      if (!turnstileToken || turnstileToken.length > 2048) {
        return jsonResponse({ error: 'La verificación de seguridad no es válida.' }, 400);
      }
      if (!isValidEmail(email)) {
        return jsonResponse({ ok: true });
      }

      const emailHash = await hashRateLimitEmail(email);
      const emailQuotaKey = `email:${emailHash}:resend-confirmation:v1`;
      const emailQuotaReservation = crypto.randomUUID();
      const reserveEmailQuota = async (): Promise<boolean> => {
        try {
          const limited = await isRateLimited(env, emailQuotaKey, 3, 3600000, emailQuotaReservation);
          if (limited) logWorkerEvent('info', 'auth_resend_rate_limited');
          return !limited;
        } catch {
          try {
            await releaseRateLimitReservation(env, emailQuotaKey, emailQuotaReservation);
          } catch {
            // A failed reservation request may have reached the Durable Object before its response was lost.
          }
          logWorkerEvent('warn', 'auth_resend_unavailable');
          return false;
        }
      };

      const confirmedAt = await getEmailConfirmedAt(email, env);
      if (confirmedAt) {
        const captchaResult = await verifyTurnstile(request, env, turnstileToken, 'resend-confirmation');
        if (captchaResult === 'invalid') {
          return jsonResponse({ error: 'La verificación de seguridad no es válida.' }, 400);
        }
        if (captchaResult === 'unavailable') {
          // Do not let a verifier outage reveal that the address belongs to a confirmed account.
          logWorkerEvent('warn', 'auth_resend_unavailable');
          return jsonResponse({ ok: true });
        }
        if (!(await reserveEmailQuota())) {
          // Keep quota infrastructure failures independent of the account state.
          return jsonResponse({ ok: true });
        }
        if (!(await sendAlreadyConfirmedEmail(email, env))) {
          logWorkerEvent('warn', 'auth_resend_unavailable');
        }
      } else {
        if (!(await reserveEmailQuota())) return jsonResponse({ ok: true });
        const resendResult = await resendSignupConfirmation(email, turnstileToken, env);
        if (resendResult === 'captcha-invalid') {
          try {
            const released = await releaseRateLimitReservation(env, emailQuotaKey, emailQuotaReservation);
            if (!released) logWorkerEvent('warn', 'auth_resend_unavailable');
          } catch {
            logWorkerEvent('warn', 'auth_resend_unavailable');
          }
          return jsonResponse({ error: 'La verificación de seguridad no es válida.' }, 400);
        }
        if (resendResult === 'unavailable') {
          logWorkerEvent('warn', 'auth_resend_unavailable');
        }
      }

      // Keep downstream delivery status identical for confirmed and unknown addresses.
      return jsonResponse({ ok: true });
    }

// 1. Interceptar solicitudes de API de Supabase Proxy
    if (path.startsWith('/api/supabase/')) {
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const method = request.method;
      const subPath = path.replace('/api/supabase', '');

      // ── Lista blanca de tablas y métodos permitidos ──
      const authHeader = request.headers.get('Authorization') || '';
      const authenticated = authHeader.startsWith('Bearer ') && authHeader !== 'Bearer dummy-key-safe-from-browsers';

      const allowedWriteTables = [
        'properties', 'property_reports', 'notifications', 'search_alerts', 'saved_properties', 'contacts',
        ...(options.additionalAuthenticatedWriteTables ?? []),
      ];
      const allowedPublicRpcs = [...(options.additionalPublicRpcs ?? [])];
      const allowedAuthenticatedRpcs = [
        'get_admin_metrics',
        'get_admin_mfa_bypass_until',
        ...(options.additionalAuthenticatedRpcs ?? []),
      ];

      const restMatch = subPath.match(/^\/rest\/v1\/([^/?]+)/);
      const tableName = restMatch ? restMatch[1] : null;
      const rpcMatch = subPath.match(/^\/rest\/v1\/rpc\/([^/?]+)/);
      const rpcName = rpcMatch ? rpcMatch[1] : null;
      const allowedAuthenticatedProfilePatch = method === 'PATCH'
        && authenticated
        && tableName === 'profiles';
      const allowedProfilePatchFields = ['full_name', 'phone', 'avatar_url', 'public_whatsapp_enabled'];
      const isAllowedAuthenticatedMfaDelete = method === 'DELETE'
        && authenticated
        && /^\/auth\/v1\/factors\/[^/?]+$/.test(subPath);
      const isAllowedAuthenticatedStorageDelete = method === 'DELETE'
        && authenticated
        && subPath.startsWith('/storage/v1/object/');
      const isAllowedAuthenticatedRpc = method === 'POST'
        && authenticated
        && rpcName !== null
        && allowedAuthenticatedRpcs.includes(rpcName);
      const isAllowedPublicRpc = method === 'POST'
        && rpcName !== null
        && allowedPublicRpcs.includes(rpcName);

      const authRateLimitResponse = await enforceAuthRateLimit(request, env, clientIp, subPath);
      if (authRateLimitResponse) {
        return authRateLimitResponse;
      }

      if (shouldCheckPwnedPassword(method, subPath)) {
        const passwordCheckRateLimit = await checkRateLimit(
          env,
          `${clientIp}:auth:pwned-password:v1`,
          10,
          60000,
        );
        if (!passwordCheckRateLimit.allowed) {
          return rateLimitResponse(passwordCheckRateLimit.resetAt);
        }

        let password: unknown;
        try {
          const parsed = await readBoundedJsonObject<{ password?: unknown }>(request.clone(), 16 * 1024);
          if (!parsed.ok) {
            if (parsed.status === 408) return jsonResponse({ error: 'Request body timed out' }, 408);
            if (parsed.status === 413) return jsonResponse({ error: 'Payload too large' }, 413);
          } else {
            password = parsed.value.password;
          }
        } catch {
          password = undefined;
        }

        if (typeof password === 'string' && password.length > 0) {
          const exposure = await checkPwnedPassword(password);
          if (exposure.status === 'pwned') {
            return jsonResponse({
              code: 'weak_password',
              message: 'Esta contraseña apareció en filtraciones conocidas. Elige una contraseña diferente.',
            }, 422);
          }
          if (exposure.status === 'unavailable') {
            logWorkerEvent('warn', 'password_exposure_check_unavailable', {
              source: 'pwned_passwords',
            });
          }
        }
      }

      // Bloquear métodos mutantes (PATCH, PUT, DELETE) a menos que sea una tabla permitida y usuario autenticado
      if (method === 'DELETE' || method === 'PATCH') {
        if (!isAllowedAuthenticatedMfaDelete
          && !isAllowedAuthenticatedStorageDelete
          && !allowedAuthenticatedProfilePatch
          && (!tableName || !allowedWriteTables.includes(tableName) || !authenticated)) {
          return jsonResponse({ error: 'Operación no permitida.' }, 403);
        }
      }

      if (allowedAuthenticatedProfilePatch) {
        const parsed = await readBoundedJsonObject(request.clone(), 16 * 1024);
        if (!parsed.ok) {
          if (parsed.status === 408) return jsonResponse({ error: 'Request body timed out' }, 408);
          if (parsed.status === 413) return jsonResponse({ error: 'Payload too large' }, 413);
          return jsonResponse({ error: 'Operación no permitida.' }, 403);
        }
        const profilePatchBody = parsed.value;

        if (
          !profilePatchBody
          || Array.isArray(profilePatchBody)
          || typeof profilePatchBody !== 'object'
          || Object.keys(profilePatchBody).some((field) => !allowedProfilePatchFields.includes(field))
          || ('public_whatsapp_enabled' in profilePatchBody
            && typeof profilePatchBody.public_whatsapp_enabled !== 'boolean')
        ) {
          return jsonResponse({ error: 'Operación no permitida.' }, 403);
        }
      }

      // Bloquear POST a tablas no permitidas
      if (method === 'POST'
        && tableName
        && (!allowedWriteTables.includes(tableName)
          || (tableName === 'saved_marketplace_listings' && !authenticated))
        && !isAllowedAuthenticatedRpc
        && !isAllowedPublicRpc) {
        return jsonResponse({ error: 'Operación no permitida.' }, 403);
      }

      // Rate limiting por tipo de operación
      // 1. Denuncias (POST a property_reports) - Máximo 3 cada 5 minutos
      if (method === 'POST' && tableName === 'property_reports') {
        const key = `${clientIp}:reports`;
        if (await isRateLimited(env, key, 3, 300000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de denuncias excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '300'
              }
            }
          );
        }
      }
      // 1b. Contactos (POST a contacts) - Máximo 5 cada 5 minutos
      else if (method === 'POST' && tableName === 'contacts') {
        const key = `${clientIp}:contacts`;
        if (await isRateLimited(env, key, 5, 300000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de mensajes excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '300'
              }
            }
          );
        }
      }
      // 2. Publicaciones (POST a properties) - Máximo 5 cada 10 minutos
      else if (method === 'POST' && tableName === 'properties') {
        const key = `${clientIp}:publish`;
        if (await isRateLimited(env, key, 5, 600000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de publicaciones excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '600'
              }
            }
          );
        }
      }
      // Firmar URLs es una lectura de Storage: el SDK usa POST, pero no debe consumir cuota de subida.
      // 3. Subida de Imágenes (POST/PUT a storage/v1/object/*) - Máximo 40 cada 10 minutos
      else if ((method === 'POST' || method === 'PUT')
        && subPath.startsWith('/storage/v1/object/')
        && !(method === 'POST' && /^\/storage\/v1\/object\/sign(?:\/|$)/.test(subPath))) {
        const key = `${clientIp}:storage`;
        if (await isRateLimited(env, key, 40, 600000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de subida de imágenes excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '600'
              }
            }
          );
        }
      }
      // 4. Límite general (GET, OPTIONS, etc.) - evita falsos positivos en navegación pública
      else {
        const key = `${clientIp}:general`;
        if (await isRateLimited(env, key, 300, 60000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de peticiones excedido. Demasiadas solicitudes.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
              }
            }
          );
        }
      }

      const supabaseUrl = env.VITE_SUPABASE_URL;
      let targetUrl = request.url.replace(
        url.origin + '/api/supabase',
        supabaseUrl
      );

      if (subPath.startsWith('/realtime/')) {
        const realtimeUrl = new URL(targetUrl);
        if (realtimeUrl.searchParams.get('apikey') === 'dummy-key-safe-from-browsers') {
          realtimeUrl.searchParams.set('apikey', env.VITE_SUPABASE_ANON_KEY);
          targetUrl = realtimeUrl.toString();
        }
      }

      const headers = new Headers();
      const allowedRequestHeaders = [
        'accept',
        'accept-profile',
        'apikey',
        'authorization',
        'content-profile',
        'content-type',
        'prefer',
        'range',
        'range-unit',
        'x-client-info',
        'x-supabase-api-version',
      ];
      for (const headerName of allowedRequestHeaders) {
        const value = request.headers.get(headerName);
        if (value) headers.set(headerName, value);
      }

      if (subPath.startsWith('/realtime/')) {
        for (const headerName of ['connection', 'sec-websocket-key', 'sec-websocket-protocol', 'sec-websocket-version', 'upgrade']) {
          const value = request.headers.get(headerName);
          if (value) headers.set(headerName, value);
        }
      }

      // Inyectar la Anon Key real si falta o es la clave dummy en el cliente
      const apiKeyHeader = headers.get('apikey');

      if (!apiKeyHeader || apiKeyHeader === 'dummy-key-safe-from-browsers') {
        headers.set('apikey', env.VITE_SUPABASE_ANON_KEY);
      }

      if (!authHeader || authHeader === 'Bearer dummy-key-safe-from-browsers') {
        headers.set('Authorization', `Bearer ${env.VITE_SUPABASE_ANON_KEY}`);
      }

      const fetchOptions: RequestInit = {
        method: request.method,
        headers: headers,
        redirect: 'manual'
      };

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (request.body) {
          const boundedBody = await readBoundedBytes(request.clone(), getSupabaseProxyBodyLimit(subPath, method));
          if (!boundedBody.ok) {
            const message = boundedBody.status === 413 ? 'Payload too large'
              : boundedBody.status === 408 ? 'Request body timed out'
                : 'Invalid request body';
            return jsonResponse({ error: message }, boundedBody.status);
          }
        }
        fetchOptions.body = request.body;
      }

      const response = await fetch(targetUrl, fetchOptions);

      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get('Location') || response.headers.get('location');
        if (redirectUrl) {
          return new Response(null, {
            status: response.status,
            headers: {
              'Location': redirectUrl
            }
          });
        }
      }

      return addSecurityHeaders(response);
    }

    // Interceptar solicitudes a la página de detalles: /propiedad/uuid o /propiedad/slug-uuid
    const match = path.match(/^\/propiedad\/([^/]+)/);

    if (match) {
      const slug = match[1];
      const propertyId = extractIdFromSlug(slug);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(propertyId)) {
        try {
          const supabaseUrl = env.VITE_SUPABASE_URL;
          const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

          // Consultar la propiedad de manera asíncrona usando la API REST pública de Supabase
          const supabaseResponse = await fetch(
            `${supabaseUrl}/rest/v1/properties?id=eq.${propertyId}&select=title,description,cover_image,price_usd`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );

          if (supabaseResponse.ok) {
            const rawProperties: unknown = await supabaseResponse.json();
            const properties = Array.isArray(rawProperties)
              ? rawProperties.filter(isRecord)
              : [];
            if (properties.length > 0) {
              const property = properties[0];
              const priceValue = property.price_usd;
              const price = (typeof priceValue === 'number' || typeof priceValue === 'string') && priceValue
                ? `USD ${priceValue.toLocaleString('en-US')}`
                : 'Precio no informado';

              const titleValue = typeof property.title === 'string' ? property.title : 'Propiedad en Cubitat';
              const descriptionValue = typeof property.description === 'string' ? property.description : '';
              const image = typeof property.cover_image === 'string' ? property.cover_image : '';
              const title = `${titleValue} - ${price}`;
              const description = descriptionValue
                ? `${descriptionValue.slice(0, 150)}... Contacto en Cubitat.`
                : 'Encuentra propiedades en venta y renta en Cuba con Cubitat.';

              // Obtener el HTML estático base desde el manejador de activos
              const assetResponse = await env.ASSETS.fetch(request);

              // Re-escribir las etiquetas HTML usando HTMLRewriter al vuelo
              // @ts-ignore
              const rewritten = new HTMLRewriter()
                .on('meta[property="og:title"]', {
                  element(el: any) {
                    el.setAttribute('content', title);
                  }
                })
                .on('meta[name="twitter:title"]', {
                  element(el: any) {
                    el.setAttribute('content', title);
                  }
                })
                .on('meta[property="og:description"]', {
                  element(el: any) {
                    el.setAttribute('content', description);
                  }
                })
                .on('meta[name="twitter:description"]', {
                  element(el: any) {
                    el.setAttribute('content', description);
                  }
                })
                .on('meta[property="og:image"]', {
                  element(el: any) {
                    el.setAttribute('content', image);
                  }
                })
                .on('meta[name="twitter:image"]', {
                  element(el: any) {
                    el.setAttribute('content', image);
                  }
                })
                .on('meta[property="og:url"]', {
                  element(el: any) {
                    el.setAttribute('content', canonicalUrl(url));
                  }
                })
                .on('link[rel="canonical"]', {
                  element(el: any) {
                    el.setAttribute('href', canonicalUrl(url));
                  }
                })
                .on('meta[property="og:type"]', {
                  element(el: any) {
                    el.setAttribute('content', 'article');
                  }
                })
                .on('title', {
                  element(el: any) {
                    el.setInnerContent(title);
                  }
                })
                .transform(assetResponse);

              // Configurar cabeceras de cacheo y seguridad
              const baseHeaders = new Headers(rewritten.headers);
              baseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
              
              const rawResponse = new Response(rewritten.body, {
                status: rewritten.status,
                statusText: rewritten.statusText,
                headers: baseHeaders
              });

              const finalResponse = addSecurityHeaders(rawResponse);

              return finalResponse;
            }
          }

          const assetResponse = await env.ASSETS.fetch(request);
          const notFoundResponse = new Response(assetResponse.body, {
            status: supabaseResponse.ok ? 404 : 503,
            headers: assetResponse.headers,
          });
          return addSecurityHeaders(
            await rewriteCanonicalLink(notFoundResponse, url, false),
            true,
          );
        } catch {
          logWorkerEvent('error', 'seo_rewrite_failed');
          const assetResponse = await env.ASSETS.fetch(request);
          const unavailableResponse = new Response(assetResponse.body, {
            status: 503,
            headers: assetResponse.headers,
          });
          return addSecurityHeaders(
            await rewriteCanonicalLink(unavailableResponse, url, false),
            true,
          );
        }
      }

      const assetResponse = await env.ASSETS.fetch(request);
      const invalidPropertyResponse = new Response(assetResponse.body, {
        status: 404,
        headers: assetResponse.headers,
      });
      return addSecurityHeaders(
        await rewriteCanonicalLink(invalidPropertyResponse, url, false),
        true,
      );
    }

    // Retorno por defecto (activos estáticos normales del frontend)
    let response = await env.ASSETS.fetch(request);

    if (path === '/sw.js' || path === '/registerSW.js') {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    // Inyectar cabeceras de Content-Type con charset=utf-8 para documentos HTML
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      const newHeaders = new Headers(response.headers);
      if (!contentType.includes('charset')) {
        newHeaders.set('Content-Type', 'text/html; charset=utf-8');
      }
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    response = await rewriteCanonicalLink(response, url);

    return addSecurityHeaders(response);
    }
  };
}

const productionWorker = createWorker();

export default {
  fetch: productionWorker.fetch,
  scheduled(_controller: unknown, env: Env, ctx: WorkerExecutionContext) {
    ctx.waitUntil(dispatchPendingPushNotifications(env));
  },
};
