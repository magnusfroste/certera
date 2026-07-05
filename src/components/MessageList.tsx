
import React, { useEffect, useRef, useState } from 'react';
import { useDiploma } from '@/contexts/DiplomaContext';

// Rough narration of what the model is doing, to soften the 10–30s wait.
// Timings are illustrative — the real work finishes when isGenerating clears.
const GENERATION_STEPS = [
  'Reading your request…',
  'Choosing a palette…',
  'Pairing typography…',
  'Composing the layout…',
  'Rendering your diploma…',
];

const useGenerationStatus = (active: boolean) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) { setStep(0); return; }
    const id = setInterval(() => {
      // Advance but hold on the last step until generation actually finishes
      setStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(id);
  }, [active]);
  return GENERATION_STEPS[step];
};

export const MessageList = () => {
  const { messages, isGenerating } = useDiploma();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const statusText = useGenerationStatus(isGenerating);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[85%]`}>
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.isUser
                  ? 'bg-primary/15 text-foreground border border-primary/20'
                  : 'bg-card text-card-foreground border border-border'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        </div>
      ))}
      
      {isGenerating && (
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            <div className="bg-card text-card-foreground border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-xs text-muted-foreground" aria-live="polite">{statusText}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
