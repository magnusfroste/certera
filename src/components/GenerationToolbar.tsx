import React, { useState, useCallback } from 'react';
import { Upload, Link, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { stunningDiplomaPrompts } from '@/constants/diplomaPrompts';

interface GenerationToolbarProps {
  isGenerating: boolean;
  onGenerateFromImage: (file: File) => void;
  onGenerateFromUrl: (url: string) => void;
  onRandomPrompt: (prompt: string) => void;
  /** Button size class, e.g. "h-7 w-7" or "h-8 w-8" */
  buttonSize?: string;
  /** Icon size class, e.g. "w-3.5 h-3.5" or "w-4 h-4" */
  iconSize?: string;
}

export const GenerationToolbar = ({
  isGenerating,
  onGenerateFromImage,
  onGenerateFromUrl,
  onRandomPrompt,
  buttonSize = 'h-8 w-8',
  iconSize = 'w-4 h-4',
}: GenerationToolbarProps) => {
  const [urlValue, setUrlValue] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && file.type.startsWith('image/')) {
        setUploadOpen(false);
        onGenerateFromImage(file);
      }
    },
    [onGenerateFromImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    multiple: false,
  });

  const handleUrlSubmit = () => {
    if (!urlValue.trim()) return;
    setUrlOpen(false);
    onGenerateFromUrl(urlValue);
    setUrlValue('');
  };

  const handleRandomPrompt = () => {
    const prompt = stunningDiplomaPrompts[Math.floor(Math.random() * stunningDiplomaPrompts.length)];
    onRandomPrompt(prompt);
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`${buttonSize} p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors`}
            disabled={isGenerating}
            aria-label="Generate from an uploaded image"
            title="Generate from image"
          >
            <Upload className={iconSize} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
          </DialogHeader>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Drop an image here, or click to select</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* URL */}
      <Popover open={urlOpen} onOpenChange={setUrlOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`${buttonSize} p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors`}
            disabled={isGenerating}
            aria-label="Generate from a website URL"
            title="Generate from website"
          >
            <Link className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium">Website URL</p>
            <div className="flex gap-2">
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button size="sm" onClick={handleUrlSubmit} disabled={!urlValue.trim()}>
                Go
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Magic */}
      <Button
        variant="ghost"
        size="sm"
        className={`${buttonSize} p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors`}
        onClick={handleRandomPrompt}
        disabled={isGenerating}
        aria-label="Fill in a random example prompt"
        title="Surprise me"
      >
        <Wand2 className={iconSize} />
      </Button>
    </div>
  );
};
