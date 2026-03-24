import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDiploma } from '@/contexts/DiplomaContext';
import { useGeneration } from '@/hooks/useGeneration';
import { MessageList } from '@/components/MessageList';
import { GenerationToolbar } from '@/components/GenerationToolbar';

interface ChatPanelProps {
  isGuest?: boolean;
  guestAccess?: {
    remainingGenerations: number;
    canGenerate: boolean;
    incrementUsage: () => void;
    maxGenerations: number;
  };
}

export const ChatPanel = ({ isGuest, guestAccess }: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const { diplomaHtml } = useDiploma();
  const { isGenerating, generateFromText, generateFromImage, generateFromUrl } = useGeneration(isGuest, guestAccess);

  const handleSendMessage = async () => {
    const text = message;
    setMessage('');
    await generateFromText(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <MessageList />

      <div className="p-3 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="relative bg-card border border-border rounded-xl transition-colors focus-within:border-primary/30">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe changes or a new diploma..."
            className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[60px] rounded-xl pb-10 bg-transparent text-foreground placeholder:text-muted-foreground"
            rows={3}
            disabled={isGenerating}
          />
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
            <GenerationToolbar
              isGenerating={isGenerating}
              onGenerateFromImage={generateFromImage}
              onGenerateFromUrl={generateFromUrl}
              onRandomPrompt={setMessage}
              buttonSize="h-7 w-7"
              iconSize="w-3.5 h-3.5"
            />

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isGenerating}
              size="sm"
              className="h-7 w-7 p-0 rounded-full bg-primary hover:bg-primary/90 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
