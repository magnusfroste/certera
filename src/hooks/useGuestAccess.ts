import { useState, useCallback } from 'react';

const GUEST_KEY = 'certera_guest_usage';
const MAX_GUEST_GENERATIONS = 3;

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

  const remainingGenerations = MAX_GUEST_GENERATIONS - usage.count;
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
    maxGenerations: MAX_GUEST_GENERATIONS,
  };
};
