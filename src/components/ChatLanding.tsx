import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationToolbar } from '@/components/GenerationToolbar';

interface ChatLandingProps {
  isGuest?: boolean;
  guestAccess?: {
    remainingGenerations: number;
    canGenerate: boolean;
    incrementUsage: () => void;
    maxGenerations: number;
  };
}

export const ChatLanding = ({ isGuest, guestAccess }: ChatLandingProps) => {
  const [message, setMessage] = useState('');
  const { isGenerating, generateFromText, generateFromImage, generateFromUrl } = useGeneration(isGuest, guestAccess);

  const handleSendMessage = async () => {
    const text = message;
    setMessage('');
    await generateFromText(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-14 h-14 mx-auto bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">What diploma would you like to create?</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Describe your vision, upload an image, or let the AI design it for you.</p>
        </div>

        {/* Quick-start suggestion chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Modern minimalist university diploma',
            'Elegant gold-bordered certificate',
            'Tech bootcamp completion certificate',
            'Professional course diploma',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => { setMessage(suggestion); }}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="relative bg-card border border-border rounded-2xl shadow-lg shadow-black/20">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe the diploma you want to create..."
            className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[100px] rounded-2xl pb-14 bg-transparent text-foreground placeholder:text-muted-foreground"
            rows={3}
            disabled={isGenerating}
          />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <GenerationToolbar
              isGenerating={isGenerating}
              onGenerateFromImage={generateFromImage}
              onGenerateFromUrl={generateFromUrl}
              onRandomPrompt={setMessage}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isGenerating}
              size="sm"
              className="h-8 w-8 p-0 rounded-full bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
            <span className="text-sm text-muted-foreground ml-2">Generating your diploma...</span>
          </div>
        )}
      </div>
    </div>
  );
};
