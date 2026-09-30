import { useEffect, useRef } from 'react';
import { TURNSTILE_SITEKEY } from '../lib/turnstileConfig';
import { logSafeEvent, sanitizeErrorReason } from '../lib/logger';

interface TurnstileWidgetProps {
  action?: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  theme?: 'light' | 'dark' | 'auto';
}

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: NonNullable<TurnstileWidgetProps['theme']>;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': (errorCode?: string) => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  getResponse?: (widgetId: string) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * A React wrapper for Cloudflare Turnstile that handles explicit rendering,
 * lazy-loading script timing, and cleanup on unmount.
 */
export function TurnstileWidget({
  action = 'turnstile-spin-v1',
  onVerify,
  onExpire,
  onError,
  theme = 'light',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const tokenIntervalRef = useRef<number | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    const scriptId = 'cloudflare-turnstile-script';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existingScript || document.createElement('script');

    if (!existingScript) {
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    function reportScriptError(code: string) {
      logSafeEvent({
        module: 'ui',
        action: 'load_turnstile',
        level: 'error',
        code,
      });
      if (active) onErrorRef.current?.(code);
    }

    function renderWidget() {
      const turnstile = window.turnstile;
      if (!turnstile || !containerRef.current || !active) return;

      const notifyToken = (token: unknown) => {
        if (typeof token !== 'string' || !token || lastTokenRef.current === token) return;
        lastTokenRef.current = token;
        onVerifyRef.current?.(token);
      };

      // Clean up previous widget if it exists to prevent duplication
      if (widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }

      try {
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITEKEY,
          action,
          theme,
          callback: (token: string) => {
            if (active) notifyToken(token);
          },
          'expired-callback': () => {
            lastTokenRef.current = null;
            if (active) onExpireRef.current?.();
          },
          'error-callback': (errorCode?: string) => {
            logSafeEvent({
              module: 'ui',
              action: 'turnstile_error',
              level: 'error',
              code: errorCode || 'UNKNOWN',
            });
            lastTokenRef.current = null;
            if (active) onErrorRef.current?.(errorCode);
          },
        });

        // Some mobile browsers render the success state but do not invoke the
        // callback reliably. Read the token exposed by Turnstile as a fallback.
        const readToken = () => {
          if (!active || !widgetIdRef.current) return;
          let token = '';
          try {
            token = turnstile.getResponse?.(widgetIdRef.current) || '';
          } catch {
            // Fall back to the response field below.
          }
          if (!token) {
            const responseField = containerRef.current?.querySelector(
              'input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]',
            ) as HTMLInputElement | HTMLTextAreaElement | null;
            token = responseField?.value || '';
          }
          notifyToken(token);
        };
        if (tokenIntervalRef.current) window.clearInterval(tokenIntervalRef.current);
        tokenIntervalRef.current = window.setInterval(readToken, 250);
      } catch (err) {
        logSafeEvent({
          module: 'ui',
          action: 'render_turnstile',
          level: 'error',
          code: sanitizeErrorReason(err),
        });
      }
    }

    const checkInterval = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(checkInterval);
        renderWidget();
      }
    }, 100);

    const timeoutId = window.setTimeout(() => {
      if (!window.turnstile && active) {
        reportScriptError('SCRIPT_LOAD_TIMEOUT');
      }
    }, 10000);

    const handleScriptLoad = () => {
      window.clearTimeout(timeoutId);
      if (window.turnstile) {
        window.clearInterval(checkInterval);
        renderWidget();
      } else {
        reportScriptError('SCRIPT_API_UNAVAILABLE');
      }
    };
    const handleScriptError = () => {
      window.clearTimeout(timeoutId);
      reportScriptError('SCRIPT_LOAD_ERROR');
    };

    script.addEventListener('load', handleScriptLoad);
    script.addEventListener('error', handleScriptError);

    // Initial check if turnstile is already loaded
    if (window.turnstile) {
      clearInterval(checkInterval);
      renderWidget();
    }

    return () => {
      active = false;
      window.clearInterval(checkInterval);
      window.clearTimeout(timeoutId);
      if (tokenIntervalRef.current) {
        window.clearInterval(tokenIntervalRef.current);
        tokenIntervalRef.current = null;
      }
      script.removeEventListener('load', handleScriptLoad);
      script.removeEventListener('error', handleScriptError);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      lastTokenRef.current = null;
    };
  }, [action, theme]);

  return (
    <div 
      ref={containerRef} 
      className="turnstile-container min-h-[65px] flex items-center justify-center my-2" 
      data-action={action}
    />
  );
}
