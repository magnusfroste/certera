import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Download, Code, Eye, Maximize, Save, X, Share, Shield, Pencil, Loader2, Undo2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { AnimationTemplates } from '@/components/AnimationTemplates';
import { Button } from '@/components/ui/button';
import { useDiploma } from '@/contexts/DiplomaContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonacoEditor } from '@/components/MonacoEditor';

// Lazy-load heavy tab content (SharePanel pulls in jspdf + html2canvas)
const SharePanel = lazy(() => import('@/components/SharePanel').then((m) => ({ default: m.SharePanel })));
const BlockchainSigner = lazy(() => import('@/components/BlockchainSigner').then((m) => ({ default: m.BlockchainSigner })));

const TabLoader = () => (
  <div className="flex justify-center py-8">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

export const PreviewPanel = () => {
  const { diplomaHtml, diplomaCss, setDiplomaHtml, setDiplomaCss, setDiplomaDsl, commitDesign, undoDesign, canUndo } = useDiploma();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [editableHtml, setEditableHtml] = useState(diplomaHtml || '');
  const [editableCss, setEditableCss] = useState(diplomaCss || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Listen for postMessage from iframe for edit mode updates
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Only accept messages from our own preview iframe
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'DIPLOMA_HTML_UPDATE' && typeof event.data.html === 'string') {
        setDiplomaHtml(event.data.html);
        // Manual inline edits diverge from the structured design — clear it
        // so the next AI iteration works from the edited HTML instead.
        setDiplomaDsl(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setDiplomaHtml, setDiplomaDsl]);

  useEffect(() => {
    setEditableHtml(diplomaHtml || '');
    setEditableCss(diplomaCss || '');
    setHasUnsavedChanges(false);
  }, [diplomaHtml, diplomaCss]);

  useEffect(() => {
    const htmlChanged = editableHtml !== (diplomaHtml || '');
    const cssChanged = editableCss !== (diplomaCss || '');
    setHasUnsavedChanges(htmlChanged || cssChanged);
  }, [editableHtml, editableCss, diplomaHtml, diplomaCss]);

  const handleSave = () => {
    // Route through commitDesign so a manual save is undoable. Hand-edited
    // code no longer matches the structured design, so drop the DSL.
    commitDesign({ html: editableHtml, css: editableCss, dsl: null });
    setHasUnsavedChanges(false);
  };

  const handleDiscard = () => {
    setEditableHtml(diplomaHtml || '');
    setEditableCss(diplomaCss || '');
    setHasUnsavedChanges(false);
  };

  const getPreviewContent = () => {
    if (!diplomaHtml && !diplomaCss) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Diploma Preview</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: 'Inter', system-ui, sans-serif;
              background: #121212;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .placeholder {
              background: #1a1a1a;
              padding: 60px;
              border-radius: 16px;
              text-align: center;
              max-width: 500px;
              border: 1px solid #2a2a2a;
            }
            .placeholder h1 {
              color: #e8e8e8;
              margin-bottom: 16px;
              font-size: 22px;
              font-weight: 500;
            }
            .placeholder p {
              color: #888;
              font-size: 14px;
              line-height: 1.6;
            }
            .icon {
              font-size: 40px;
              margin-bottom: 16px;
              opacity: 0.5;
            }
          </style>
        </head>
        <body>
          <div class="placeholder">
            <div class="icon">✨</div>
            <h1>Your diploma will appear here</h1>
            <p>Describe what you want to create and the canvas will come to life.</p>
          </div>
        </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Diploma Preview</title>
        <style>
          ${diplomaCss}
          body {
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .diploma-wrapper {
            width: 100%;
            min-height: calc(100vh - 40px);
            position: relative;
            overflow-x: hidden;
          }
          .diploma-wrapper * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .diploma-wrapper [style*="position: absolute"],
          .diploma-wrapper [style*="position:absolute"] {
            max-width: 95% !important;
          }
          ${isEditMode ? `
          [contenteditable="true"] {
            outline: none;
            cursor: text;
          }
          [contenteditable="true"]:hover {
            outline: 2px dashed rgba(99, 102, 241, 0.5);
            outline-offset: 2px;
            border-radius: 2px;
          }
          [contenteditable="true"]:focus {
            outline: 2px solid rgba(99, 102, 241, 0.8);
            outline-offset: 2px;
            border-radius: 2px;
            background: rgba(99, 102, 241, 0.05);
          }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="diploma-wrapper">
          ${diplomaHtml}
        </div>
        ${isEditMode ? `
        <script>
          (function() {
            var tags = ['h1','h2','h3','h4','h5','h6','p','span','td','th','li','a','label','strong','em','b','i','u','small','blockquote'];
            var wrapper = document.querySelector('.diploma-wrapper');
            if (!wrapper) return;
            var els = wrapper.querySelectorAll(tags.join(','));
            els.forEach(function(el) {
              el.setAttribute('contenteditable', 'true');
              el.addEventListener('blur', function() {
                var html = wrapper.innerHTML;
                window.parent.postMessage({ type: 'DIPLOMA_HTML_UPDATE', html: html }, '*');
              });
            });
          })();
        </script>
        ` : ''}
      </body>
      </html>
    `;
  };

  const handleDownload = () => {
    const content = getPreviewContent();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diploma.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="preview" className="h-full flex flex-col">
        {/* Compact single-row header */}
        <div className="px-2 sm:px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="h-8 bg-secondary flex-wrap h-auto min-w-0">
            <TabsTrigger value="preview" className="text-xs h-6 px-2.5">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="html" className="text-xs h-6 px-2.5">
              <Code className="w-3 h-3 mr-1" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" className="text-xs h-6 px-2.5">
              <Code className="w-3 h-3 mr-1" />
              CSS
            </TabsTrigger>
            <TabsTrigger value="sign" className="text-xs h-6 px-2.5">
              <Shield className="w-3 h-3 mr-1" />
              Sign
            </TabsTrigger>
            <TabsTrigger value="share" className="text-xs h-6 px-2.5">
              <Share className="w-3 h-3 mr-1" />
              Share
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
              onClick={undoDesign}
              disabled={!canUndo}
              aria-label="Undo last design change"
              title="Undo last change"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <AnimationTemplates />
            <Toggle
              size="sm"
              pressed={isEditMode}
              onPressedChange={setIsEditMode}
              className="h-7 w-7 p-0 text-muted-foreground data-[state=on]:text-primary data-[state=on]:bg-primary/10"
              aria-label="Toggle edit mode"
              disabled={!diplomaHtml}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Toggle>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={handleFullscreen} aria-label="Fullscreen preview">
              <Maximize className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={handleDownload} aria-label="Download as HTML">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-background flex flex-col">
          <TabsContent value="preview" className="flex-1 p-3 m-0">
            {isEditMode && (
              <div className="mb-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs text-foreground">
                ✏️ Click any text to edit it. Changes save automatically.
              </div>
            )}
            <div className="h-full rounded-xl border border-border overflow-hidden shadow-lg shadow-black/20">
              <iframe
                ref={iframeRef}
                sandbox="allow-scripts"
                srcDoc={getPreviewContent()}
                className="w-full h-full border-0"
                title="Diploma Preview"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="html" className="flex-1 p-3 m-0 overflow-hidden">
            <div className="h-full flex flex-col">
              {hasUnsavedChanges && (
                <div className="mb-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-foreground font-medium">
                    Unsaved changes
                  </span>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleDiscard} className="h-6 text-xs px-2">
                      <X className="w-3 h-3 mr-1" />
                      Discard
                    </Button>
                    <Button size="sm" onClick={handleSave} className="h-6 text-xs px-2">
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex-1 rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-secondary/50">
                  <h3 className="text-xs font-medium text-muted-foreground">HTML</h3>
                </div>
                <div className="h-full">
                  <MonacoEditor
                    value={editableHtml}
                    onChange={setEditableHtml}
                    language="html"
                    placeholder="HTML content will appear here..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="css" className="flex-1 p-3 m-0 overflow-hidden">
            <div className="h-full flex flex-col">
              {hasUnsavedChanges && (
                <div className="mb-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-foreground font-medium">
                    Unsaved changes
                  </span>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleDiscard} className="h-6 text-xs px-2">
                      <X className="w-3 h-3 mr-1" />
                      Discard
                    </Button>
                    <Button size="sm" onClick={handleSave} className="h-6 text-xs px-2">
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex-1 rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-secondary/50">
                  <h3 className="text-xs font-medium text-muted-foreground">CSS</h3>
                </div>
                <div className="h-full">
                  <MonacoEditor
                    value={editableCss}
                    onChange={setEditableCss}
                    language="css"
                    placeholder="CSS styles will appear here..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sign" className="flex-1 p-3 m-0">
            <div className="max-w-md mx-auto">
              <Suspense fallback={<TabLoader />}>
                <BlockchainSigner />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="share" className="flex-1 p-3 m-0">
            <div className="max-w-md mx-auto">
              <Suspense fallback={<TabLoader />}>
                <SharePanel />
              </Suspense>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
