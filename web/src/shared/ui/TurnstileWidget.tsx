import { useEffect, useRef } from 'react';
import { TURNSTILE_SITEKEY } from '../lib/turnstileConfig';
import { logSafeEvent, sanitizeErrorReason } from '../lib/logger';

interface TurnstileWidgetProps {
  action?: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
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

    function renderWidget() {
      const turnstile = (window as any).turnstile;
      if (!turnstile || !containerRef.current || !active) return;

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
            if (active) onVerifyRef.current?.(token);
          },
          'expired-callback': () => {
            if (active) onExpireRef.current?.();
          },
          'error-callback': () => {
            if (active) onErrorRef.current?.();
          },
        });
      } catch (err) {
        logSafeEvent({
          module: 'ui',
          action: 'render_turnstile',
          level: 'error',
          code: sanitizeErrorReason(err),
        });
      }
    }

    const checkInterval = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(checkInterval);
        renderWidget();
      }
    }, 100);

    // Initial check if turnstile is already loaded
    if ((window as any).turnstile) {
      clearInterval(checkInterval);
      renderWidget();
    }

    return () => {
      active = false;
      clearInterval(checkInterval);
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
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
