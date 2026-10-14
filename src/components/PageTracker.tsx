import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track`;

// Measure the live site only — never previews, the Lovable editor or local dev,
// which would otherwise drown the real numbers in our own testing.
const isLiveSite = () => /(^|\.)certera\.ink$/i.test(window.location.hostname);

// Honour explicit opt-outs even though nothing here is a cookie or an IP.
const optedOut = () =>
  navigator.doNotTrack === '1' ||
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/**
 * Sends one cookieless page-view beacon per route change to the `track` edge
 * function, which feeds the ops-mcp get_traffic tool. Renders nothing.
 */
export const PageTracker = () => {
  const { pathname } = useLocation();
  // document.referrer keeps the original external source for the whole SPA
  // session, so it is only meaningful on the first view; later in-app
  // navigations would otherwise all be credited to that source.
  const isFirstView = useRef(true);

  useEffect(() => {
    if (!isLiveSite() || optedOut()) return;

    const payload = JSON.stringify({
      path: pathname,
      referrer: isFirstView.current ? document.referrer : '',
    });
    isFirstView.current = false;

    // text/plain keeps this a "simple" request: no CORS preflight, and
    // sendBeacon survives the page being closed or navigated away.
    const blob = new Blob([payload], { type: 'text/plain' });
    if (!navigator.sendBeacon?.(TRACK_URL, blob)) {
      fetch(TRACK_URL, { method: 'POST', body: blob, keepalive: true, mode: 'no-cors' }).catch(() => {
        /* measurement must never surface an error to the visitor */
      });
    }
  }, [pathname]);

  return null;
};
