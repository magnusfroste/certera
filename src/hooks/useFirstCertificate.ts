import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFirstCertificate(userId: string | undefined) {
  const key = userId ? `certera:onboarding:${userId}` : '';
  const [organization, setOrganization] = useState('');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));
  useEffect(() => {
    if (!userId) return;
    let current = true;
    let saved = '';
    let skipped = false;
    try {
      saved = localStorage.getItem(`${key}:organization`) || '';
      skipped = localStorage.getItem(`${key}:skipped`) === 'true';
    } catch { /* Storage may be unavailable; the guide still works in memory. */ }
    setOrganization(saved);
    void supabase.from('signed_diplomas').select('id', { count: 'exact', head: true })
      .eq('issuer_id', userId).then(({ count, error }) => {
        if (!current) return;
        setActive(!error && count === 0 && !skipped);
        setLoading(false);
      });
    return () => { current = false; };
  }, [userId, key]);
  const saveOrganization = (name: string) => {
    setOrganization(name.trim());
    try { localStorage.setItem(`${key}:organization`, name.trim()); } catch { /* In-memory fallback. */ }
  };
  const skip = () => {
    setActive(false);
    try { localStorage.setItem(`${key}:skipped`, 'true'); } catch { /* In-memory fallback. */ }
  };
  return { active, loading, organization, saveOrganization, skip };
}