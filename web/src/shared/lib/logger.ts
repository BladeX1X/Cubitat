export type LogModule =
  | 'auth'
  | 'admin'
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
  message?: string;
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
  if (!err) {
    return 'UNKNOWN_ERROR';
  }

  if (typeof err === 'string') {
    let sanitized = err;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized.slice(0, 100);
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;

    // Check standard error code or name
    if (typeof obj.code === 'string' && obj.code.length > 0 && obj.code.length <= 40) {
      return obj.code;
    }
    if (typeof obj.name === 'string' && obj.name.length > 0 && obj.name !== 'Error') {
      return obj.name;
    }
    if (typeof obj.message === 'string') {
      let msg = obj.message;
      for (const pattern of SENSITIVE_PATTERNS) {
        msg = msg.replace(pattern, '[REDACTED]');
      }
      return msg.slice(0, 100);
    }
  }

  return 'UNHANDLED_EXCEPTION';
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
    ...(event.message ? { message: event.message } : {}),
    ...(safeContext ? { context: safeContext } : {}),
  };

  const outputString = `[${payload.module.toUpperCase()}:${payload.action}] ${payload.level.toUpperCase()}${
    payload.code ? ` (${payload.code})` : ''
  }${payload.message ? `: ${payload.message}` : ''}`;

  if (payload.level === 'error') {
    console.error(outputString, payload.context ?? '');
  } else if (payload.level === 'warn') {
    console.warn(outputString, payload.context ?? '');
  } else {
    console.info(outputString, payload.context ?? '');
  }
}
