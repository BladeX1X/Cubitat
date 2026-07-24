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
    expect(sanitizeErrorReason(new Error('Failed to fetch user test@example.com'))).toBe('UNHANDLED_EXCEPTION');
    expect(sanitizeErrorReason({ code: 'AUTH_EXPIRED' })).toBe('BACKEND_ERROR');
    expect(sanitizeErrorReason({ name: 'TypeError' })).toBe('CLIENT_TYPE_ERROR');
  });

  it('redacts sensitive string patterns such as email, phone numbers, and URLs', () => {
    const rawError = 'Error at https://api.example.com/v1?token=123 for user@test.com phone 5351234567';
    const sanitized = sanitizeErrorReason(rawError);
    expect(sanitized).not.toContain('user@test.com');
    expect(sanitized).not.toContain('https://api.example.com/v1?token=123');
    expect(sanitized).not.toContain('5351234567');
    expect(sanitized).toBe('UNHANDLED_EXCEPTION');
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
});
