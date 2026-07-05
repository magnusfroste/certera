import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Home, Palette, Frame, Type, Stamp, PenTool, Image, Layers } from 'lucide-react';
import {
  backgroundStyles,
  borderStyles,
  headerStyles,
  sealStyles,
  signatureStyles,
} from '@/diploma-dsl/blocks';
import { DSL_BLOCK_OPTIONS } from '@/diploma-dsl/types';

const PREVIEW_COLOR = '#1a365d';
const ACCENT_COLOR = '#c6a961';

const BlockPreview = ({ html, css, label, width = 280, height = 180 }: { html: string; css: string; label: string; width?: number; height?: number }) => {
  const srcDoc = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; width: 100%; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100%; font-family: Georgia, serif; overflow: hidden; }
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');
  ${css}
</style></head><body>${html}</body></html>`;

  return (
    <div className="flex flex-col items-center gap-2">
      <iframe
        sandbox=""
        srcDoc={srcDoc}
        className="border border-border rounded-md bg-white"
        style={{ width, height, pointerEvents: 'none' }}
        title={label}
      />
      <Badge variant="secondary" className="text-xs">{label}</Badge>
    </div>
  );
};

const DSLExplorer = () => {
  const navigate = useNavigate();

  const backgroundPreviews = useMemo(() =>
    DSL_BLOCK_OPTIONS.backgroundStyles.map(style => ({
      label: style,
      html: `<div class="bg-preview"></div>`,
      css: `.bg-preview { width:100%; height:100%; ${backgroundStyles[style]} }`,
    })), []);

  const borderPreviews = useMemo(() =>
    DSL_BLOCK_OPTIONS.borderStyles.filter(s => s !== 'none').map(style => {
      const css = borderStyles[style](PREVIEW_COLOR);
      return {
        label: style,
        html: `<div class="diploma-border" style="width:220px;height:140px;padding:16px;background:white;">
          <div style="text-align:center;color:#999;font-size:12px;margin-top:40px;">${style}</div>
        </div>`,
        css,
      };
    }), []);

  const headerPreviews = useMemo(() =>
    DSL_BLOCK_OPTIONS.headerStyles.map(style => {
      const css = headerStyles[style](PREVIEW_COLOR);
      return {
        label: style,
        html: `<div class="diploma-header" style="padding:16px;">
          <div class="institution">Academy Name</div>
          <div class="subtitle">School of Engineering</div>
        </div>`,
        css,
      };
    }), []);

  const sealPreviews = useMemo(() =>
    DSL_BLOCK_OPTIONS.sealStyles.filter(s => s !== 'none').map(style => {
      const seal = sealStyles[style](ACCENT_COLOR, 'VERIFIED');
      return {
        label: style,
        html: seal.html,
        css: seal.css,
      };
    }), []);

  const signaturePreviews = useMemo(() =>
    DSL_BLOCK_OPTIONS.signatureStyles.map(style => {
      const sig = signatureStyles[style]('Mr Diploma', 'Director', PREVIEW_COLOR);
      return {
        label: style,
        html: sig.html,
        css: sig.css,
      };
    }), []);

  const tabs = [
    { value: 'backgrounds', label: 'Backgrounds', icon: Image, items: backgroundPreviews },
    { value: 'borders', label: 'Borders', icon: Frame, items: borderPreviews },
    { value: 'headers', label: 'Headers', icon: Type, items: headerPreviews },
    { value: 'seals', label: 'Seals', icon: Stamp, items: sealPreviews, height: 120, width: 140 },
    { value: 'signatures', label: 'Signatures', icon: PenTool, items: signaturePreviews, height: 100 },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">DSL Block Explorer</h1>
              <p className="text-sm text-muted-foreground">All available block combinations for diploma generation</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <Home className="h-4 w-4 mr-2" />
            Admin
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {tabs.map(t => (
            <Card key={t.value}>
              <CardContent className="p-4 flex items-center gap-3">
                <t.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{t.items.length}</p>
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Total combinations */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground text-lg">
                  {tabs.reduce((acc, t) => acc * t.items.length, 1).toLocaleString()}
                </span>
                {' '}unique combinations possible (excl. colors, orientation & padding)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Block tabs */}
        <Tabs defaultValue="backgrounds">
          <TabsList className="flex-wrap h-auto">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <t.icon className="h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(t => (
            <TabsContent key={t.value} value={t.value}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <t.icon className="h-5 w-5" />
                    {t.label} ({t.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {t.items.map(item => (
                      <BlockPreview
                        key={item.label}
                        html={item.html}
                        css={item.css}
                        label={item.label}
                        width={t.width ?? 280}
                        height={t.height ?? 180}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default DSLExplorer;
