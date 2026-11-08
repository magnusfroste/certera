import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
// The same rule the server enforces, so the count shown here is the real one.
import {
  DEFAULT_GUEST_DAILY_LIMIT,
  GUEST_ACCESS_KEY,
  parseGuestDailyLimit,
} from '../../supabase/functions/_shared/guestAccess';

const GUEST_KEY = 'certera_guest_usage';

interface GuestUsage {
  count: number;
  createdAt: string;
}

export const useGuestAccess = () => {
  const getUsage = (): GuestUsage => {
    try {
      const stored = localStorage.getItem(GUEST_KEY);
      if (stored) {
        const usage = JSON.parse(stored) as GuestUsage;
        // Reset after 24 hours
        const created = new Date(usage.createdAt);
        const now = new Date();
        if (now.getTime() - created.getTime() > 24 * 60 * 60 * 1000) {
          const fresh = { count: 0, createdAt: now.toISOString() };
          localStorage.setItem(GUEST_KEY, JSON.stringify(fresh));
          return fresh;
        }
        return usage;
      }
    } catch {
      // ignore
    }
    const fresh = { count: 0, createdAt: new Date().toISOString() };
    localStorage.setItem(GUEST_KEY, JSON.stringify(fresh));
    return fresh;
  };

  const [usage, setUsage] = useState<GuestUsage>(getUsage);
  // Set in /admin (app_settings.guest_access, readable by everyone). Until it
  // loads, the default applies — the server enforces the real value anyway.
  const [maxGenerations, setMaxGenerations] = useState(DEFAULT_GUEST_DAILY_LIMIT);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', GUEST_ACCESS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMaxGenerations(parseGuestDailyLimit(data?.value));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remainingGenerations = Math.max(0, maxGenerations - usage.count);
  const canGenerate = remainingGenerations > 0;

  const incrementUsage = useCallback(() => {
    setUsage((prev) => {
      const updated = { ...prev, count: prev.count + 1 };
      localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    remainingGenerations,
    canGenerate,
    incrementUsage,
    maxGenerations,
  };
};
