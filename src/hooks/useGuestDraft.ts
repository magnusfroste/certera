import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useDiploma } from '@/contexts/DiplomaContext';
import type { Json } from '@/integrations/supabase/types';
import { clearGuestDraft, readGuestDraft, saveGuestDraft } from '@/lib/guestDraft';

/**
 * Carries a guest's design through sign-up (see src/lib/guestDraft.ts).
 * As a guest: restores the draft once on load (a refresh keeps the work) and
 * keeps it up to date. Signed in: adopts the draft into the empty studio,
 * saves it to the account and clears it.
 */
export function useGuestDraft(isGuest: boolean, signedIn: boolean) {
  const {
    diplomaHtml, diplomaCss, diplomaDsl, diplomaFormat, messages, isGenerating, currentSessionId,
    commitDesign, setMessages, setDiplomaFormat, saveSession,
  } = useDiploma();
  const restored = useRef(false);

  // Restore (guest) or adopt (signed in), once per mount.
  useEffect(() => {
    if (restored.current || (!isGuest && !signedIn)) return;
    restored.current = true;
    if (diplomaHtml || currentSessionId) return; // never overwrite work already in the studio
    const draft = readGuestDraft();
    if (!draft) return;
    commitDesign({ html: draft.html, css: draft.css, dsl: draft.dsl as Json | null });
    setDiplomaFormat(draft.format);
    setMessages(draft.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
    if (signedIn) {
      clearGuestDraft();
      const firstPrompt = draft.messages.find((m) => m.isUser)?.content.slice(0, 50);
      // saveSession reads the context through refs, which the commit above
      // has already updated; wait one tick for the message state to land.
      setTimeout(() => {
        saveSession(firstPrompt || 'Untitled Diploma');
      }, 0);
      toast.success('Your diploma from the demo is saved to your account.');
    }
  }, [isGuest, signedIn, diplomaHtml, currentSessionId, commitDesign, setDiplomaFormat, setMessages, saveSession]);

  // Keep the guest's draft current.
  useEffect(() => {
    if (!isGuest || isGenerating || !diplomaHtml) return;
    saveGuestDraft({
      html: diplomaHtml,
      css: diplomaCss,
      dsl: diplomaDsl,
      format: diplomaFormat,
      messages: messages.map((m) => ({ id: m.id, content: m.content, isUser: m.isUser, timestamp: m.timestamp.toISOString() })),
    });
  }, [isGuest, isGenerating, diplomaHtml, diplomaCss, diplomaDsl, diplomaFormat, messages]);
}
