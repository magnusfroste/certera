import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check, QrCode, Loader2, Mail, Linkedin, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useDiploma } from '@/contexts/DiplomaContext';
import { useSignedDiploma } from '@/hooks/useSignedDiploma';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { SITE_URL } from '@/lib/siteUrl';
import { previewHtml } from '@/lib/recipient';

export const SharePanel = ({ compact = false }: { compact?: boolean }) => {
  const { diplomaHtml, diplomaCss, signingRecipientName } = useDiploma();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const signed = useSignedDiploma();
  const currentDiplomaId = signed?.id || '';
  const isSignedDiploma = !!signed;
  const shareUrl = signed?.url || window.location.href;
  const shareTitle = 'My verified diploma on certera.ink';
  const hasContent = diplomaHtml || diplomaCss;

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const verificationUrl = currentDiplomaId
        ? `${SITE_URL}/verify/${currentDiplomaId}`
        : shareUrl;

      // The renderer caps portrait diplomas at 620px (landscape at 800px), so
      // the stored CSS tells us the orientation. Size the capture box and the
      // PDF page to match — otherwise a portrait diploma is squashed into a
      // fixed 800×600 landscape frame.
      const isPortrait = /\.diploma-container\s*\{[^}]*max-width:\s*620px/.test(diplomaCss || '');
      const boxW = isPortrait ? 600 : 800;
      const boxH = isPortrait ? 800 : 600;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = `
        <div style="width: ${boxW}px; height: ${boxH}px; padding: 20px; background: white; position: relative; overflow: hidden;">
          <style>
            ${diplomaCss}
            * { box-sizing: border-box !important; }
            .diploma-container {
              width: 100% !important;
              height: 100% !important;
              position: relative !important;
              overflow: hidden !important;
            }
            .diploma-container * { max-width: 95% !important; box-sizing: border-box !important; }
            .diploma-container [style*="position: absolute"],
            .diploma-container [style*="position:absolute"] { max-width: 90% !important; }
          </style>
          <div class="diploma-container">${previewHtml(diplomaHtml, signingRecipientName)}</div>
          
          <div style="position: absolute; top: 12px; right: 12px; background: rgba(37, 99, 235, 0.95); color: white; padding: 6px 12px; border-radius: 15px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; backdrop-filter: blur(4px);">
            <span style="font-size: 12px;">🛡️</span>
            Verified by certera.ink
          </div>
          
          ${currentDiplomaId ? `
          <div style="position: absolute; bottom: 12px; left: 12px; text-align: center; z-index: 1000;">
            <div style="background: rgba(255, 255, 255, 0.95); padding: 6px; border-radius: 6px; border: 2px solid #e5e7eb; margin-bottom: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); backdrop-filter: blur(4px);">
              <div id="qr-code-container" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;"></div>
            </div>
            <div style="font-size: 8px; color: #444; font-family: 'Courier New', monospace; word-break: break-all; max-width: 72px; background: rgba(255, 255, 255, 0.9); padding: 2px 4px; border-radius: 3px; border: 1px solid #d1d5db; font-weight: 500;">
              ${currentDiplomaId}
            </div>
          </div>
          ` : ''}
        </div>
      `;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      document.body.appendChild(tempDiv);

      if (currentDiplomaId) {
        const qrContainer = tempDiv.querySelector('#qr-code-container') as HTMLElement;
        if (qrContainer) {
          const qrTempDiv = document.createElement('div');
          document.body.appendChild(qrTempDiv);
          
          const { createRoot } = await import('react-dom/client');
          const root = createRoot(qrTempDiv);
          
          await new Promise<void>((resolve) => {
            root.render(
              React.createElement(QRCodeGenerator, {
                value: verificationUrl,
                size: 60,
                level: 'M'
              })
            );

            // Poll for the rendered SVG instead of a single fixed timeout,
            // so slow devices don't end up with an empty QR box in the PDF.
            const startedAt = Date.now();
            const tryGrabQr = () => {
              const qrSvg = qrTempDiv.querySelector('svg');
              if (!qrSvg && Date.now() - startedAt < 2000) {
                setTimeout(tryGrabQr, 50);
                return;
              }
              if (qrSvg) {
                qrContainer.appendChild(qrSvg.cloneNode(true));
              }
              root.unmount();
              document.body.removeChild(qrTempDiv);
              resolve();
            };
            setTimeout(tryGrabQr, 50);
          });
        }
      }

      const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
        width: boxW,
        height: boxH,
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('.diploma-container') as HTMLElement;
          if (clonedContainer) {
            clonedContainer.style.overflow = 'hidden';
          }
        }
      });

      const pdf = new jsPDF(isPortrait ? 'portrait' : 'landscape', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const aspectRatio = boxH / boxW;
      let finalWidth = pdfWidth;
      let finalHeight = pdfWidth * aspectRatio;
      
      if (finalHeight > pdfHeight) {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight / aspectRatio;
      }
      
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save('diploma.pdf');

      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Could not copy the link to your clipboard.');
    }
  };

  return (
    <section aria-label="Share diploma" className="space-y-5">
      {!compact && <div><h2 className="text-lg font-semibold">Share your achievement</h2><p className="text-sm text-muted-foreground mt-1">A diploma. A link. Proof anyone can check.</p></div>}
      {hasContent && !isSignedDiploma && <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">Sign your diploma to get its public link and QR code.</p>}
      {!compact && isSignedDiploma && <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-success" />Authentic diploma · Registered on Hedera</p>}
      {isSignedDiploma && currentDiplomaId && <>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={copyToClipboard} className="min-h-11">{copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}{copied ? 'Copied!' : 'Copy link'}</Button>
          <Button variant="outline" className="min-h-11" onClick={() => setShowQR(!showQR)} aria-expanded={showQR}><QrCode className="size-4 mr-2" />QR code</Button>
          <Button variant="outline" className="min-h-11" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')}><Linkedin className="size-4 mr-2" />LinkedIn</Button>
          <Button variant="outline" className="min-h-11" asChild><a href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`}><Mail className="size-4 mr-2" />Email</a></Button>
        </div>
        {showQR && <div className="flex flex-col items-center gap-3 py-4 border-y border-border"><QRCodeGenerator value={`${SITE_URL}/verify/${currentDiplomaId}`} size={140} /><p className="text-xs font-mono text-muted-foreground break-all text-center">{currentDiplomaId}</p></div>}
      </>}
      <Button onClick={generatePDF} disabled={!hasContent || isGeneratingPDF} variant="outline" className="w-full min-h-11">
        {isGeneratingPDF ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}{isGeneratingPDF ? 'Generating PDF...' : 'Download as PDF'}
      </Button>
      {signed && <Button variant="ghost" className="w-full" asChild><a href={signed.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4 mr-2" />View signed diploma</a></Button>}
    </section>
  );
};
