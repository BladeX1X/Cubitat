import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logSafeEvent, sanitizeErrorReason } from './logger';

describe('logger.ts - Safe Frontend Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes unknown errors correctly without exposing stack or raw objects', () => {
    expect(sanitizeErrorReason(null)).toBe('UNKNOWN_ERROR');
    expect(sanitizeErrorReason(undefined)).toBe('UNKNOWN_ERROR');
    expect(sanitizeErrorReason(new Error('Failed to fetch user test@example.com'))).toBe('NETWORK_REQUEST_FAILED');
    expect(sanitizeErrorReason(new Error('permission denied for private contact row'))).toBe('ACCESS_DENIED');
    expect(sanitizeErrorReason(new Error('unexpected private backend detail'))).toBe('CLIENT_ERROR');
    expect(sanitizeErrorReason({ code: 'AUTH_EXPIRED' })).toBe('BACKEND_ERROR');
    expect(sanitizeErrorReason({ name: 'TypeError' })).toBe('CLIENT_TYPE_ERROR');
    expect(sanitizeErrorReason({ privateContact: '5551234567' })).toBe('UNRECOGNIZED_ERROR_OBJECT');
    expect(sanitizeErrorReason({ message: { privateContact: '5551234567' } })).toBe('ERROR_OBJECT_MESSAGE');
  });

  it('preserves safe Supabase and PostgreSQL error codes without logging messages', () => {
    expect(sanitizeErrorReason({ code: 'PGRST204', status: 400, message: 'private detail' })).toBe('PGRST204');
    expect(sanitizeErrorReason({ code: '23514', message: 'private detail' })).toBe('DATABASE_23514');
    expect(sanitizeErrorReason({ status: 403, message: 'private detail' })).toBe('HTTP_STATUS_403');
  });

  it('accepts the closed set of Phase 4 module names', () => {
    for (const module of ['home_services', 'materials', 'service_reviews', 'business_benefits', 'valuation'] as const) {
      logSafeEvent({ module, action: 'load_catalog', level: 'warn' });
    }

    expect(console.warn).toHaveBeenCalledTimes(5);
    expect(vi.mocked(console.warn).mock.calls.map(([message]) => message)).toEqual([
      '[HOME_SERVICES:load_catalog] WARN',
      '[MATERIALS:load_catalog] WARN',
      '[SERVICE_REVIEWS:load_catalog] WARN',
      '[BUSINESS_BENEFITS:load_catalog] WARN',
      '[VALUATION:load_catalog] WARN',
    ]);
  });

  it('redacts sensitive string patterns such as email, phone numbers, and URLs', () => {
    const rawError = 'Error at https://api.example.com/v1?token=123 for user@test.com phone 5351234567';
    const sanitized = sanitizeErrorReason(rawError);
    expect(sanitized).not.toContain('user@test.com');
    expect(sanitized).not.toContain('https://api.example.com/v1?token=123');
    expect(sanitized).not.toContain('5351234567');
    expect(sanitized).toBe('UNHANDLED_EXCEPTION');
  });

  it('classifies common RPC failures without exposing private error text', () => {
    expect(sanitizeErrorReason({ message: 'JWT expired for admin@example.com' })).toBe('AUTH_TOKEN_ERROR');
    expect(sanitizeErrorReason({ message: 'Could not find the function public.get_admin_property_contact_details' }))
      .toBe('RPC_FUNCTION_UNAVAILABLE');
    expect(sanitizeErrorReason({ message: 'permission denied for contact +5355512345' })).toBe('ACCESS_DENIED');
    expect(sanitizeErrorReason({ message: 'Failed to fetch https://private.example/rpc?token=secret' }))
      .toBe('NETWORK_REQUEST_FAILED');
    expect(sanitizeErrorReason({ error: { code: '42501', message: 'permission denied for private contact 5551234567' } }))
      .toBe('DATABASE_42501');
    expect(sanitizeErrorReason({ error: { code: 'PGRST202', message: 'private response detail' } })).toBe('PGRST202');
    expect(sanitizeErrorReason({ error: { cause: { error: { code: 'PGRST202' } } } })).toBe('PGRST202');
    const nestedPrivateError = sanitizeErrorReason({ error: { error: 'Private email person@example.com, phone 5551234567' } });
    expect(nestedPrivateError).toBe('UNCLASSIFIED_ERROR_MESSAGE');
    expect(nestedPrivateError).not.toContain('person@example.com');
    expect(nestedPrivateError).not.toContain('5551234567');
  });

  it('strips blocked sensitive keys (email, phone, token, id, etc.) from event context', () => {
    logSafeEvent({
      module: 'auth',
      action: 'login',
      level: 'error',
      code: 'AUTH_FAILED',
      context: {
        email: 'user@example.com',
        phone: '12345678',
        token: 'secret-token-value',
        user_id: 'usr_12345',
        property_id: 'prop_999',
        safe_param: 'ok_value',
        retry_count: 3,
      },
    });

    expect(console.error).toHaveBeenCalledTimes(1);
    const mockCall = vi.mocked(console.error).mock.calls[0];
    const logMessage = mockCall[0];
    const loggedContext = mockCall[1] as Record<string, unknown>;

    expect(logMessage).toContain('[AUTH:login] ERROR (AUTH_FAILED)');
    expect(loggedContext).toBeDefined();
    expect(loggedContext.email).toBeUndefined();
    expect(loggedContext.phone).toBeUndefined();
    expect(loggedContext.token).toBeUndefined();
    expect(loggedContext.user_id).toBeUndefined();
    expect(loggedContext.property_id).toBeUndefined();
    expect(loggedContext.safe_param).toBe('ok_value');
    expect(loggedContext.retry_count).toBe(3);
  });

  it('ignores free-form messages even when an untyped caller injects one', () => {
    logSafeEvent({
      module: 'auth',
      action: 'login_failed',
      level: 'error',
      message: 'raw user@test.com token=secret',
    } as Parameters<typeof logSafeEvent>[0] & { message: string });

    const output = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(output).not.toContain('user@test.com');
    expect(output).not.toContain('token=secret');
  });

  it('replaces a free-form code with a closed safe classification', () => {
    logSafeEvent({
      module: 'auth',
      action: 'login_failed',
      level: 'error',
      code: 'Invalid login for user@test.com token=secret',
    });

    const output = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(output).toContain('(UNCLASSIFIED_ERROR)');
    expect(output).not.toContain('user@test.com');
    expect(output).not.toContain('token=secret');
  });

  it('replaces untyped structural fields before writing to console', () => {
    logSafeEvent({
      module: 'user@test.com',
      action: 'https://private.example/token=secret',
      level: 'private-level',
      code: 'AUTH_FAILED',
    } as unknown as Parameters<typeof logSafeEvent>[0]);

    expect(console.error).toHaveBeenCalledTimes(1);
    const output = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(output).toContain('[CORE:invalid_action] ERROR (AUTH_FAILED)');
    expect(output).not.toContain('user@test.com');
    expect(output).not.toContain('private.example');
    expect(output).not.toContain('private-level');
    expect(output).not.toContain('token=secret');
  });
});
