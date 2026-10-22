import { useEffect, useState } from 'react';
import { useDiploma } from '@/contexts/DiplomaContext';
import { supabase } from '@/integrations/supabase/client';
import { createContentHash, DIPLOMA_SIGNED_EVENT } from '@/services/blockchainService';
import { personalizeHtml } from '@/lib/recipient';

// Presentation-only lookup: matches exactly the document currently on screen.
export function useSignedDiploma() {
  const { diplomaHtml, diplomaCss, signingRecipientName } = useDiploma();
  const key = JSON.stringify([diplomaHtml, diplomaCss, signingRecipientName]);
  const [match, setMatch] = useState<{ key: string; url: string; id: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        if (!diplomaHtml && !diplomaCss) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const html = signingRecipientName.trim() ? personalizeHtml(diplomaHtml, signingRecipientName) : diplomaHtml;
        const hash = await createContentHash(html, diplomaCss);
        const { data } = await supabase.from('signed_diplomas')
          .select('diploma_url, blockchain_id').eq('issuer_id', user.id).eq('content_hash', hash)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!cancelled) setMatch(data?.diploma_url ? { key, url: data.diploma_url, id: data.blockchain_id } : null);
      } catch (error) { console.error('Could not look up signed diploma:', error); }
    };
    void refresh();
    window.addEventListener(DIPLOMA_SIGNED_EVENT, refresh);
    return () => { cancelled = true; window.removeEventListener(DIPLOMA_SIGNED_EVENT, refresh); };
  }, [diplomaHtml, diplomaCss, signingRecipientName, key]);
  return match?.key === key ? match : null;
}