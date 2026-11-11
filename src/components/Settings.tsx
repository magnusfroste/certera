
import React from 'react';
import { Button } from '@/components/ui/button';
import { useDiploma } from '@/contexts/DiplomaContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Layout } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings as SettingsIcon } from 'lucide-react';
import { cssHasFormat, cssWithFormat, dslWithFormat, type DiplomaFormat } from '@/lib/diplomaFormat';

// Settings content component for embedding in other dialogs
export const SettingsContent = () => {
  const { toast } = useToast();
  // Use the shared context so the setting actually affects generation
  const { diplomaFormat, setDiplomaFormat, diplomaHtml, diplomaCss, diplomaDsl, commitDesign } = useDiploma();

  const handleFormatChange = (format: DiplomaFormat) => {
    if (format === diplomaFormat) return;
    setDiplomaFormat(format);
    localStorage.setItem('diplomaFormat', format);
    // Turn the design on screen too, as one undoable step.
    if (diplomaHtml && cssHasFormat(diplomaCss)) {
      commitDesign({
        html: diplomaHtml,
        css: cssWithFormat(diplomaCss, format),
        dsl: dslWithFormat(diplomaDsl, format),
      });
    }
    toast({
      title: 'Format updated',
      description: `A4 ${format}. New designs use it, and the one on screen was turned.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Diploma Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Diploma Settings
          </CardTitle>
          <CardDescription>
            Configure your diploma generation preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Diploma Format</Label>
            <div className="flex gap-2">
              <Toggle
                pressed={diplomaFormat === 'landscape'}
                onPressedChange={() => handleFormatChange('landscape')}
                className="flex-1 justify-center"
              >
                Landscape
              </Toggle>
              <Toggle
                pressed={diplomaFormat === 'portrait'}
                onPressedChange={() => handleFormatChange('portrait')}
                className="flex-1 justify-center"
              >
                Portrait
              </Toggle>
            </div>
            <p className="text-sm text-muted-foreground">
              A4 <span className="font-medium">{diplomaFormat}</span>. You can also ask in the chat: “make it portrait”.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Full settings component with trigger (for standalone use)
export const Settings = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your application preferences
          </DialogDescription>
        </DialogHeader>
        <SettingsContent />
      </DialogContent>
    </Dialog>
  );
};
