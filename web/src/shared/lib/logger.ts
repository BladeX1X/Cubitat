const LOG_MODULES = [
  'auth',
  'admin',
  'admin_kyc',
  'admin_property_verification',
  'properties',
  'publish',
  'account',
  'detail',
  'my_properties',
  'maps',
  'cache',
  'app',
  'referrals',
  'kyc',
  'property_verification',
  'agents',
  'agent_dashboard',
  'home_services',
  'materials',
  'service_reviews',
  'business_benefits',
  'valuation',
  'alerts',
  'reputation',
  'error_boundary',
  'ui',
  'core',
] as const;

export type LogModule = (typeof LOG_MODULES)[number];

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

const SAFE_LOG_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_LOG_ACTION_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const SAFE_LOG_MODULES = new Set<string>(LOG_MODULES);

function sanitizeLogCode(code?: string): string | undefined {
  if (!code) return undefined;
  return SAFE_LOG_CODE_PATTERN.test(code) ? code : 'UNCLASSIFIED_ERROR';
}

function sanitizeLogModule(module: LogModule): LogModule {
  return SAFE_LOG_MODULES.has(module) ? module : 'core';
}

function sanitizeLogAction(action: string): string {
  return SAFE_LOG_ACTION_PATTERN.test(action) ? action : 'invalid_action';
}

function sanitizeLogLevel(level: LogLevel): LogLevel {
  return level === 'info' || level === 'warn' || level === 'error' ? level : 'error';
}

/**
 * Classifies an unknown error into a safe, closed error string code.
 * Guaranteed not to return stack traces, raw error objects, emails, URLs, or IDs.
 */
export function sanitizeErrorReason(err: unknown): string {
  if (!err) return 'UNKNOWN_ERROR'
  if (typeof err === 'string') return classifyErrorMessage(err) ?? 'UNHANDLED_EXCEPTION'
  if (typeof err !== 'object') return 'UNHANDLED_EXCEPTION'
  return classifyStructuredError(err, 0, new WeakSet<object>()) ?? 'UNHANDLED_EXCEPTION'
}

function classifyStructuredError(
  input: object,
  depth: number,
  visited: WeakSet<object>,
): string | undefined {
  if (depth >= 4) return 'ERROR_NESTING_LIMIT'
  if (visited.has(input)) return 'ERROR_CYCLE'
  visited.add(input)

  const value = input as Record<string, unknown>
  if (value.name === 'AbortError') return 'REQUEST_ABORTED'
  if (value.name === 'TypeError') return 'CLIENT_TYPE_ERROR'
  if (typeof value.code === 'string') {
    if (/^PGRST[0-9]{3}$/.test(value.code)) return value.code
    if (/^[0-9A-Z]{5}$/.test(value.code)) return `DATABASE_${value.code}`
    return 'BACKEND_ERROR'
  }
  if (typeof value.status === 'number') {
    if (Number.isInteger(value.status) && value.status >= 100 && value.status <= 599) {
      return `HTTP_STATUS_${value.status}`
    }
    return 'HTTP_REQUEST_FAILED'
  }

  if (typeof value.message === 'string') {
    const messageCode = classifyErrorMessage(value.message)
    if (messageCode) return messageCode
  }

  for (const field of ['details', 'hint', 'cause', 'error'] as const) {
    const fieldValue = value[field]
    if (typeof fieldValue === 'string') {
      const fieldCode = classifyErrorMessage(fieldValue)
      if (fieldCode) return fieldCode
      if (field === 'error') return 'UNCLASSIFIED_ERROR_MESSAGE'
    } else if (fieldValue && typeof fieldValue === 'object') {
      const nestedCode = classifyStructuredError(fieldValue, depth + 1, visited)
      if (nestedCode) return nestedCode
    }
  }

  if (value instanceof Error) return 'CLIENT_ERROR'
  const safeShapeFields = ['name', 'code', 'status', 'message', 'details', 'hint', 'cause', 'error']
    .filter((field) => Object.hasOwn(value, field) && value[field] !== undefined && value[field] !== null)
    .map((field) => field.toUpperCase())
  if (safeShapeFields.length > 0) return `ERROR_OBJECT_${safeShapeFields.join('_')}`
  if (Array.isArray(input)) return 'ERROR_ARRAY'
  return Object.keys(value).length === 0 ? 'EMPTY_ERROR_OBJECT' : 'UNRECOGNIZED_ERROR_OBJECT'
}

function classifyErrorMessage(message: string): string | undefined {
  const normalized = message.toLowerCase()
  if (/failed to fetch|networkerror|network request failed|load failed/.test(normalized)) {
    return 'NETWORK_REQUEST_FAILED'
  }
  if (/invalid jwt|jwt expired|token expired|signature verification failed/.test(normalized)) {
    return 'AUTH_TOKEN_ERROR'
  }
  if (/permission denied|not authorized|unauthorized|forbidden/.test(normalized)) {
    return 'ACCESS_DENIED'
  }
  if (/schema cache/.test(normalized)) return 'POSTGREST_SCHEMA_CACHE'
  if (/could not find the function|function .* does not exist|function not found/.test(normalized)) {
    return 'RPC_FUNCTION_UNAVAILABLE'
  }
  if (/invalid input syntax|malformed array literal|invalid uuid/.test(normalized)) {
    return 'INVALID_RPC_ARGUMENT'
  }
  if (/timeout|timed out|request aborted/.test(normalized)) return 'REQUEST_TIMEOUT'
  return undefined
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
  const safeCode = sanitizeLogCode(event.code);

  const payload: FrontendLogEvent = {
    module: sanitizeLogModule(event.module),
    action: sanitizeLogAction(event.action),
    level: sanitizeLogLevel(event.level),
    ...(safeCode ? { code: safeCode } : {}),
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
