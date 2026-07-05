import { useCallback } from 'react';
import { useDiploma } from '@/contexts/DiplomaContext';
import { generateDiploma, generateDiplomaFromImage, generateDiplomaFromUrl } from '@/services/anthropicService';
import type { Message } from '@/contexts/DiplomaContext';
import type { ChatMessage } from '@/services/anthropicService';

interface GuestAccess {
  remainingGenerations: number;
  canGenerate: boolean;
  incrementUsage: () => void;
  maxGenerations: number;
}

function createMessage(content: string, isUser: boolean): Message {
  return {
    id: crypto.randomUUID(),
    content,
    isUser,
    timestamp: new Date(),
  };
}

export function useGeneration(isGuest?: boolean, guestAccess?: GuestAccess) {
  const {
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
    diplomaHtml,
    diplomaCss,
    setDiplomaHtml,
    setDiplomaCss,
    diplomaFormat,
  } = useDiploma();

  const applyResponse = useCallback(
    (response: { message: string; html: string; css: string }) => {
      setMessages((prev: Message[]) => [...prev, createMessage(response.message, false)]);
      if (response.html) setDiplomaHtml(response.html);
      if (response.css) setDiplomaCss(response.css);
      if (isGuest && guestAccess) guestAccess.incrementUsage();
    },
    [isGuest, guestAccess, setMessages, setDiplomaHtml, setDiplomaCss],
  );

  const addError = useCallback(
    (text: string) => {
      setMessages((prev: Message[]) => [...prev, createMessage(text, false)]);
    },
    [setMessages],
  );

  /** Generate from a text prompt (conversational) */
  const generateFromText = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isGenerating) return;
      if (isGuest && guestAccess && !guestAccess.canGenerate) {
        addError('You have used all your free generations. Create an account for unlimited access!');
        return;
      }

      const userMsg = createMessage(userText, true);
      setMessages((prev: Message[]) => [...prev, userMsg]);
      setIsGenerating(true);

      try {
        const chatMessages: ChatMessage[] = messages
          .map((msg) => ({
            role: msg.isUser ? ('user' as const) : ('assistant' as const),
            content: msg.content,
          }));
        chatMessages.push({ role: 'user' as const, content: userMsg.content });

        const response = await generateDiploma({
          messages: chatMessages,
          requestType: 'text',
          currentHtml: diplomaHtml || undefined,
          currentCss: diplomaCss || undefined,
          diplomaFormat,
        });
        applyResponse(response);
      } catch {
        addError('Sorry, I encountered an error. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, isGuest, guestAccess, messages, diplomaHtml, diplomaCss, diplomaFormat, setMessages, setIsGenerating, applyResponse, addError],
  );

  /** Generate from an uploaded image file */
  const generateFromImage = useCallback(
    async (file: File) => {
      if (isGenerating) return;
      setIsGenerating(true);
      setMessages((prev: Message[]) => [
        ...prev,
        createMessage(`Generate a diploma inspired by uploaded image: ${file.name}`, true),
      ]);

      try {
        const response = await generateDiplomaFromImage(file);
        applyResponse(response);
      } catch {
        addError('Sorry, I encountered an error analyzing the image. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, setIsGenerating, setMessages, applyResponse, addError],
  );

  /** Generate from a website URL */
  const generateFromUrl = useCallback(
    async (url: string) => {
      if (!url.trim() || isGenerating) return;
      try {
        new URL(url);
      } catch {
        return;
      }

      setIsGenerating(true);
      setMessages((prev: Message[]) => [
        ...prev,
        createMessage(`Generate a diploma inspired by this website: ${url}`, true),
      ]);

      try {
        const response = await generateDiplomaFromUrl(url);
        applyResponse(response);
      } catch {
        addError('Sorry, I encountered an error analyzing the website. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, setIsGenerating, setMessages, applyResponse, addError],
  );

  return {
    isGenerating,
    generateFromText,
    generateFromImage,
    generateFromUrl,
  };
}
