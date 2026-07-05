import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Image, Globe, Share2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET = 'branding-assets';

interface BrandingSettings {
  appName: string;
  appDescription: string;
  logoUrl: string;
  faviconUrl: string;
}

interface OgSettings {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterSite: string;
}

const defaultBranding: BrandingSettings = {
  appName: 'certera.ink',
  appDescription: 'Diploma Agent Generator',
  logoUrl: '/lovable-uploads/0fe040f4-6866-4c1f-8dff-ec186506d1b0.png',
  faviconUrl: '/lovable-uploads/0fe040f4-6866-4c1f-8dff-ec186506d1b0.png',
};

const defaultOg: OgSettings = {
  ogTitle: 'certera.ink',
  ogDescription: 'Diploma Agent Generator',
  ogImage: '',
  twitterCard: 'summary_large_image',
  twitterSite: '',
};

// --- Upload helper ---

async function uploadBrandingFile(file: File, path: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const filePath = `${path}.${ext}`;

  // Upsert: remove old file first (ignore error if doesn't exist)
  await supabase.storage.from(BUCKET).remove([filePath]);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  // Append cache-buster
  return `${data.publicUrl}?v=${Date.now()}`;
}

// --- FileUploadField component ---

interface FileUploadFieldProps {
  label: string;
  value: string;
  storagePath: string;
  accept?: string;
  previewClassName?: string;
  onChange: (url: string) => void;
}

const FileUploadField = ({ label, value, storagePath, accept = 'image/*', previewClassName = 'h-10 w-10', onChange }: FileUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadBrandingFile(file, storagePath);
      onChange(url);
      toast.success(`${label} uploaded!`);
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL or upload a file"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {value && (
        <div className="flex items-center gap-2 mt-1">
          <img src={value} alt={`${label} preview`} className={`${previewClassName} object-contain rounded border`} />
          <span className="text-xs text-muted-foreground">Preview</span>
        </div>
      )}
    </div>
  );
};

// --- Main component ---

const AdminBranding = () => {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [og, setOg] = useState<OgSettings>(defaultOg);
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingOg, setSavingOg] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['branding', 'og_social']);

    if (error) {
      console.error('Failed to load branding settings:', error);
      toast.error('Could not load current branding settings');
    }
    if (data) {
      for (const row of data) {
        if (row.key === 'branding') {
          setBranding({ ...defaultBranding, ...(row.value as Partial<BrandingSettings>) });
        }
        if (row.key === 'og_social') {
          setOg({ ...defaultOg, ...(row.value as Partial<OgSettings>) });
        }
      }
    }
    setLoading(false);
  };

  const upsertSetting = async (key: string, value: BrandingSettings | OgSettings) => {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      return error;
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({ key, value });
      return error;
    }
  };

  const saveBranding = async () => {
    setSavingBranding(true);
    const error = await upsertSetting('branding', branding);
    if (error) toast.error('Failed to save branding settings');
    else toast.success('Branding settings saved');
    setSavingBranding(false);
  };

  const saveOg = async () => {
    setSavingOg(true);
    const error = await upsertSetting('og_social', og);
    if (error) toast.error('Failed to save OG/social settings');
    else toast.success('OG & social share settings saved');
    setSavingOg(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            Branding
          </CardTitle>
          <CardDescription>
            App name, description, logo and favicon. Upload files directly to cloud storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={branding.appName}
                onChange={(e) => setBranding(prev => ({ ...prev, appName: e.target.value }))}
                placeholder="Diplomator"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appDescription">App Description</Label>
              <Input
                id="appDescription"
                value={branding.appDescription}
                onChange={(e) => setBranding(prev => ({ ...prev, appDescription: e.target.value }))}
                placeholder="Diploma Design Generator"
              />
            </div>
            <FileUploadField
              label="Logo"
              value={branding.logoUrl}
              storagePath="logo"
              onChange={(url) => setBranding(prev => ({ ...prev, logoUrl: url }))}
            />
            <FileUploadField
              label="Favicon"
              value={branding.faviconUrl}
              storagePath="favicon"
              accept="image/png,image/x-icon,image/svg+xml"
              previewClassName="h-8 w-8"
              onChange={(url) => setBranding(prev => ({ ...prev, faviconUrl: url }))}
            />
          </div>
          <Button onClick={saveBranding} disabled={savingBranding} className="gap-1">
            {savingBranding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Branding
          </Button>
        </CardContent>
      </Card>

      {/* OG & Social Share */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            OG & Social Share
          </CardTitle>
          <CardDescription>
            Open Graph and Twitter Card meta tags for link previews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ogTitle">OG Title</Label>
              <Input
                id="ogTitle"
                value={og.ogTitle}
                onChange={(e) => setOg(prev => ({ ...prev, ogTitle: e.target.value }))}
                placeholder="Diplomator"
              />
              <p className="text-xs text-muted-foreground">Max 60 characters recommended</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitterCard">Twitter Card Type</Label>
              <Input
                id="twitterCard"
                value={og.twitterCard}
                onChange={(e) => setOg(prev => ({ ...prev, twitterCard: e.target.value }))}
                placeholder="summary_large_image"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ogDescription">OG Description</Label>
              <Textarea
                id="ogDescription"
                value={og.ogDescription}
                onChange={(e) => setOg(prev => ({ ...prev, ogDescription: e.target.value }))}
                placeholder="Diploma Design Generator"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Max 160 characters recommended</p>
            </div>
            <FileUploadField
              label="OG Image"
              value={og.ogImage}
              storagePath="og-image"
              previewClassName="max-h-24"
              onChange={(url) => setOg(prev => ({ ...prev, ogImage: url }))}
            />
            <div className="space-y-2">
              <Label htmlFor="twitterSite">Twitter @handle</Label>
              <Input
                id="twitterSite"
                value={og.twitterSite}
                onChange={(e) => setOg(prev => ({ ...prev, twitterSite: e.target.value }))}
                placeholder="@yourbrand"
              />
            </div>
          </div>
          <Button onClick={saveOg} disabled={savingOg} className="gap-1">
            {savingOg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save OG & Social
          </Button>
        </CardContent>
      </Card>

      {/* Self-hosting note */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Open Source Note
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Branding assets are stored in the <code className="bg-muted px-1 rounded">branding-assets</code> storage bucket.
            Settings are stored in the <code className="bg-muted px-1 rounded">app_settings</code> table.
          </p>
          <p>
            OG meta tags are best served via SSR or a pre-rendering service for social crawlers.
            For SPA deployments, consider using a serverless function or edge middleware to inject these tags.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBranding;
