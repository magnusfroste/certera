
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface DiplomaFields {
  recipientName: string;
  degree: string;
  field: string;
  institution: string;
  date: string;
}

interface DesignSnapshot {
  html: string;
  css: string;
  dsl: Json | null;
}

interface DiplomaContextType {
  diplomaHtml: string;
  setDiplomaHtml: (html: string) => void;
  diplomaCss: string;
  setDiplomaCss: (css: string) => void;
  /** Structured design (DSL) matching the current HTML/CSS, or null after manual edits */
  diplomaDsl: Json | null;
  setDiplomaDsl: (dsl: Json | null) => void;
  /** Apply a new design and push the previous one onto the undo history */
  commitDesign: (next: DesignSnapshot) => void;
  /** Restore the previous design; no-op when there is nothing to undo */
  undoDesign: () => void;
  canUndo: boolean;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  diplomaFields: DiplomaFields;
  setDiplomaFields: (fields: DiplomaFields) => void;
  signingRecipientName: string;
  setSigningRecipientName: (name: string) => void;
  signingInstitutionName: string;
  setSigningInstitutionName: (name: string) => void;
  diplomaFormat: 'portrait' | 'landscape';
  setDiplomaFormat: (format: 'portrait' | 'landscape') => void;
  // Session management
  currentSessionId: string | null;
  loadSession: (id: string) => Promise<void>;
  saveSession: (title?: string) => Promise<void>;
  resetSession: () => void;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const DiplomaContext = createContext<DiplomaContextType | undefined>(undefined);

const EMPTY_FIELDS: DiplomaFields = { recipientName: '', degree: '', field: '', institution: '', date: '' };

export const DiplomaProvider = ({ children }: { children: ReactNode }) => {
  const [diplomaHtml, setDiplomaHtml] = useState('');
  const [diplomaCss, setDiplomaCss] = useState('');
  const [diplomaDsl, setDiplomaDsl] = useState<Json | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef<DesignSnapshot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signingRecipientName, setSigningRecipientName] = useState('');
  const [signingInstitutionName, setSigningInstitutionName] = useState('');
  const [diplomaFormat, setDiplomaFormat] = useState<'portrait' | 'landscape'>(() => {
    const saved = localStorage.getItem('diplomaFormat');
    return saved === 'landscape' || saved === 'portrait' ? saved : 'portrait';
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [diplomaFields, setDiplomaFields] = useState<DiplomaFields>(EMPTY_FIELDS);
  const [messages, setMessages] = useState<Message[]>([]);

  // ── Refs: always-fresh values for async operations ──
  const htmlRef = useRef(diplomaHtml);
  const cssRef = useRef(diplomaCss);
  const dslRef = useRef(diplomaDsl);
  const formatRef = useRef(diplomaFormat);
  const messagesRef = useRef(messages);
  const sessionIdRef = useRef(currentSessionId);
  const isResettingRef = useRef(false);
  const wasGenerating = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { htmlRef.current = diplomaHtml; }, [diplomaHtml]);
  useEffect(() => { cssRef.current = diplomaCss; }, [diplomaCss]);
  useEffect(() => { dslRef.current = diplomaDsl; }, [diplomaDsl]);
  useEffect(() => { formatRef.current = diplomaFormat; }, [diplomaFormat]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { sessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // ── Design history (undo) ──
  const MAX_HISTORY = 20;

  const applySnapshot = useCallback((snap: DesignSnapshot) => {
    htmlRef.current = snap.html;
    cssRef.current = snap.css;
    dslRef.current = snap.dsl;
    setDiplomaHtml(snap.html);
    setDiplomaCss(snap.css);
    setDiplomaDsl(snap.dsl);
  }, []);

  const commitDesign = useCallback((next: DesignSnapshot) => {
    const current: DesignSnapshot = { html: htmlRef.current, css: cssRef.current, dsl: dslRef.current };
    // Only record a history step when there's a real, changed previous design
    if (current.html && (current.html !== next.html || current.css !== next.css)) {
      historyRef.current.push(current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      setCanUndo(true);
    }
    applySnapshot(next);
  }, [applySnapshot]);

  const undoDesign = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setCanUndo(historyRef.current.length > 0);
    applySnapshot(prev);
  }, [applySnapshot]);

  // ── Save session (reads from refs, no stale closures) ──
  const saveSession = useCallback(async (title?: string) => {
    if (isResettingRef.current) return; // Guard: don't save during reset

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const html = htmlRef.current;
    const css = cssRef.current;
    const dsl = dslRef.current;
    const format = formatRef.current;
    const msgs = JSON.parse(JSON.stringify(messagesRef.current));
    const sessionId = sessionIdRef.current;

    if (sessionId) {
      const { error } = await supabase
        .from('diploma_sessions')
        .update({
          diploma_html: html,
          diploma_css: css,
          diploma_dsl: dsl,
          diploma_format: format,
          messages: msgs,
          title: title || 'Untitled Diploma',
        })
        .eq('id', sessionId);
      if (error) {
        console.error('Failed to save session:', error);
        toast.error('Could not save your session. Your latest changes may be lost.');
      }
    } else {
      const { data, error } = await supabase
        .from('diploma_sessions')
        .insert({
          diploma_html: html,
          diploma_css: css,
          diploma_dsl: dsl,
          diploma_format: format,
          messages: msgs,
          title: title || 'Untitled Diploma',
          user_id: user.id,
        })
        .select('id')
        .single();
      if (error) {
        console.error('Failed to create session:', error);
        toast.error('Could not save your session. Your latest changes may be lost.');
      } else if (data) {
        // Update the ref synchronously so a save racing this one doesn't
        // also see a null session id and insert a duplicate row.
        sessionIdRef.current = data.id;
        setCurrentSessionId(data.id);
      }
    }
  }, []); // No deps needed — reads from refs

  // ── Auto-save after generation completes ──
  useEffect(() => {
    if (isGenerating) {
      wasGenerating.current = true;
      return;
    }
    if (wasGenerating.current && htmlRef.current) {
      wasGenerating.current = false;
      const userMessages = messagesRef.current.filter(m => m.isUser);
      const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
      const autoTitle = lastUserMsg.slice(0, 50) || 'Untitled Diploma';
      saveSession(autoTitle);
    }
  }, [isGenerating, saveSession]);

  // ── Reset session (guarded) ──
  const resetSession = useCallback(() => {
    isResettingRef.current = true;
    // Clear the ref synchronously so in-flight saves don't write to the old session
    sessionIdRef.current = null;
    setCurrentSessionId(null);
    setDiplomaHtml('');
    setDiplomaCss('');
    setDiplomaDsl(null);
    historyRef.current = [];
    setCanUndo(false);
    const saved = localStorage.getItem('diplomaFormat');
    setDiplomaFormat(saved === 'landscape' || saved === 'portrait' ? saved : 'portrait');
    setDiplomaFields(EMPTY_FIELDS);
    setMessages([]);
    // Allow saves again after React flushes the reset. setTimeout (not rAF)
    // so the guard also clears in backgrounded tabs where rAF is throttled.
    setTimeout(() => { isResettingRef.current = false; }, 0);
  }, []);

  // ── Load session ──
  const loadSession = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('diploma_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      if (error) {
        console.error('Failed to load session:', error);
        toast.error('Could not load that session.');
      }
      return;
    }

    sessionIdRef.current = data.id;
    setCurrentSessionId(data.id);
    // Loading a session starts a fresh undo history
    historyRef.current = [];
    setCanUndo(false);
    setDiplomaHtml(data.diploma_html);
    setDiplomaCss(data.diploma_css);
    setDiplomaDsl(data.diploma_dsl ?? null);
    setDiplomaFormat((data.diploma_format as 'portrait' | 'landscape') || 'portrait');

    const savedMessages = data.messages as unknown;
    if (Array.isArray(savedMessages) && savedMessages.length > 0) {
      setMessages((savedMessages as Array<Omit<Message, 'timestamp'> & { timestamp: string }>).map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })));
    } else {
      setMessages([]);
    }
  }, []);

  return (
    <DiplomaContext.Provider value={{
      diplomaHtml,
      setDiplomaHtml,
      diplomaCss,
      setDiplomaCss,
      diplomaDsl,
      setDiplomaDsl,
      commitDesign,
      undoDesign,
      canUndo,
      isGenerating,
      setIsGenerating,
      messages,
      setMessages,
      diplomaFields,
      setDiplomaFields,
      signingRecipientName,
      setSigningRecipientName,
      signingInstitutionName,
      setSigningInstitutionName,
      diplomaFormat,
      setDiplomaFormat,
      currentSessionId,
      loadSession,
      saveSession,
      resetSession,
    }}>
      {children}
    </DiplomaContext.Provider>
  );
};

export const useDiploma = () => {
  const context = useContext(DiplomaContext);
  if (context === undefined) {
    throw new Error('useDiploma must be used within a DiplomaProvider');
  }
  return context;
};

export type { Message, DiplomaFields };
