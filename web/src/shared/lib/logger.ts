export type LogModule =
  | 'auth'
  | 'admin'
  | 'admin_kyc'
  | 'properties'
  | 'publish'
  | 'account'
  | 'detail'
  | 'my_properties'
  | 'maps'
  | 'cache'
  | 'app'
  | 'referrals'
  | 'kyc'
  | 'agents'
  | 'agent_dashboard'
  | 'alerts'
  | 'reputation'
  | 'error_boundary'
  | 'ui'
  | 'core';

export type LogLevel = 'info' | 'warn' | 'error';

export interface FrontendLogEvent {
  module: LogModule;
  action: string;
  level: LogLevel;
  code?: string;
  context?: Record<string, string | number | boolean | null>;
}

// Disallowed property names in context to prevent PII / secret / ID exposure
const BLOCKED_KEYS = [
  'email',
  'phone',
  'password',
  'token',
  'secret',
  'credential',
  'key',
  'id',
  'user_id',
  'property_id',
  'report_id',
  'url',
  'query',
  'body',
  'stack',
  'error',
];

// Disallowed patterns in values (emails, JWTs, phone numbers, full URLs with queries)
const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Emails
  /https?:\/\/[^\s]+/g,                                  // URLs
  /\b\d{8,15}\b/g,                                        // Phone / Long Numeric IDs
  /bearer\s+[a-zA-Z0-9._~+/-]+=*/gi,                     // Bearer tokens
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWT tokens
];

/**
 * Classifies an unknown error into a safe, closed error string code.
 * Guaranteed not to return stack traces, raw error objects, emails, URLs, or IDs.
 */
export function sanitizeErrorReason(err: unknown): string {
  if (!err) return 'UNKNOWN_ERROR'
  if (typeof err !== 'object') return 'UNHANDLED_EXCEPTION'

  const value = err as Record<string, unknown>
  if (value.name === 'AbortError') return 'REQUEST_ABORTED'
  if (value.name === 'TypeError') return 'CLIENT_TYPE_ERROR'
  if (typeof value.status === 'number') return 'HTTP_REQUEST_FAILED'
  if (typeof value.code === 'string') {
    if (/^PGRST\d{3}$/.test(value.code)) return 'SUPABASE_API_ERROR'
    if (/^[0-9A-Z]{5}$/.test(value.code)) return 'DATABASE_ERROR'
    return 'BACKEND_ERROR'
  }
  return 'UNHANDLED_EXCEPTION'
}

/**
 * Filters context keys and values to ensure no sensitive fields or PII are logged.
 */
function sanitizeContext(
  rawContext?: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> | undefined {
  if (!rawContext) return undefined;

  const safeContext: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(rawContext)) {
    const lowerKey = key.toLowerCase();
    
    // Skip any blocked key name or key containing sensitive terms
    if (BLOCKED_KEYS.some((blocked) => lowerKey.includes(blocked))) {
      continue;
    }

    if (typeof value === 'string') {
      let sanitizedVal = value;
      for (const pattern of SENSITIVE_PATTERNS) {
        sanitizedVal = sanitizedVal.replace(pattern, '[REDACTED]');
      }
      safeContext[key] = sanitizedVal.slice(0, 100);
    } else {
      safeContext[key] = value;
    }
  }

  return Object.keys(safeContext).length > 0 ? safeContext : undefined;
}

/**
 * Emits a structured, safe frontend event.
 * Strips raw error objects, sensitive keys, and PII.
 */
export function logSafeEvent(event: FrontendLogEvent): void {
  const safeContext = sanitizeContext(event.context);

  const payload: FrontendLogEvent = {
    module: event.module,
    action: event.action,
    level: event.level,
    ...(event.code ? { code: event.code } : {}),
    ...(safeContext ? { context: safeContext } : {}),
  };

  const outputString = `[${payload.module.toUpperCase()}:${payload.action}] ${payload.level.toUpperCase()}${
    payload.code ? ` (${payload.code})` : ''
  }`;

  if (payload.level === 'error') {
    console.error(outputString, payload.context ?? '');
  } else if (payload.level === 'warn') {
    console.warn(outputString, payload.context ?? '');
  } else {
    console.info(outputString, payload.context ?? '');
  }
}
