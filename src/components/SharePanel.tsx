import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share2, Copy, Check, QrCode, Loader2 } from 'lucide-react';
import { useDiploma } from '@/contexts/DiplomaContext';
import { supabase } from '@/integrations/supabase/client';
import { createContentHash, DIPLOMA_SIGNED_EVENT } from '@/services/blockchainService';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  WhatsappIcon
} from 'react-share';

export const SharePanel = () => {
  const { diplomaHtml, diplomaCss } = useDiploma();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diplomaUrl, setDiplomaUrl] = useState('');
  const [currentDiplomaId, setCurrentDiplomaId] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isSignedDiploma, setIsSignedDiploma] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Look up the signed record matching the diploma that is on screen
    // (by content hash) — not just the user's most recently signed diploma.
    const fetchSignedDiploma = async () => {
      try {
        if (!diplomaHtml && !diplomaCss) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const contentHash = await createContentHash(diplomaHtml, diplomaCss);
        const { data } = await supabase
          .from('signed_diplomas')
          .select('diploma_url, blockchain_id')
          .eq('issuer_id', user.id)
          .eq('content_hash', contentHash)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (data?.diploma_url) {
          setDiplomaUrl(data.diploma_url);
          setCurrentDiplomaId(data.blockchain_id);
          setIsSignedDiploma(true);
        } else {
          setDiplomaUrl(window.location.href);
          setCurrentDiplomaId('');
          setIsSignedDiploma(false);
        }
      } catch (error) {
        console.error('Error fetching diploma URL:', error);
      }
    };

    fetchSignedDiploma();
    // Refresh when the user signs the current diploma
    window.addEventListener(DIPLOMA_SIGNED_EVENT, fetchSignedDiploma);
    return () => {
      cancelled = true;
      window.removeEventListener(DIPLOMA_SIGNED_EVENT, fetchSignedDiploma);
    };
  }, [diplomaHtml, diplomaCss]);

  const shareUrl = diplomaUrl || window.location.href;
  const shareTitle = "Check out my diploma created with Diploma Generator!";
  const hasContent = diplomaHtml || diplomaCss;

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const verificationUrl = currentDiplomaId 
        ? `${window.location.origin}/verify/${currentDiplomaId}`
        : shareUrl;
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = `
        <div style="width: 800px; height: 600px; padding: 20px; background: white; position: relative; overflow: hidden;">
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
          <div class="diploma-container">${diplomaHtml}</div>
          
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
        width: 800,
        height: 600,
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

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const aspectRatio = 600 / 800;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Share & Export
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Download your diploma or share it with others
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Info */}
        {hasContent && !isSignedDiploma && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              💡 Sign your diploma to the blockchain first to get a shareable link and QR code
            </p>
          </div>
        )}

        {isSignedDiploma && currentDiplomaId && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              ✅ This is a verified blockchain diploma with QR verification
            </p>
          </div>
        )}

        {/* Export Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Export</h4>
          <Button
            onClick={generatePDF}
            disabled={!hasContent || isGeneratingPDF}
            className="w-full"
            variant="outline"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download as PDF
              </>
            )}
          </Button>
          {hasContent && (
            <p className="text-xs text-muted-foreground">
              PDF includes verification badge{currentDiplomaId ? ' and QR code' : ''}
            </p>
          )}
        </div>

        {/* Share Link Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Share Link</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            
            {isSignedDiploma && currentDiplomaId && (
              <Button
                variant="outline"
                onClick={() => setShowQR(!showQR)}
                size="icon"
              >
                <QrCode className="w-4 h-4" />
              </Button>
            )}
          </div>

          {showQR && currentDiplomaId && (
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <div className="text-center">
                <QRCodeGenerator 
                  value={`${window.location.origin}/verify/${currentDiplomaId}`}
                  size={100}
                />
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {currentDiplomaId}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Social Media Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Social Media</h4>
          <div className="grid grid-cols-2 gap-3">
            <FacebookShareButton url={shareUrl} hashtag="#diploma">
              <div className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors w-full justify-center">
                <FacebookIcon size={16} round />
                <span className="text-sm">Facebook</span>
              </div>
            </FacebookShareButton>

            <TwitterShareButton url={shareUrl} title={shareTitle}>
              <div className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors w-full justify-center">
                <TwitterIcon size={16} round />
                <span className="text-sm">Twitter</span>
              </div>
            </TwitterShareButton>

            <LinkedinShareButton url={shareUrl} title={shareTitle}>
              <div className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors w-full justify-center">
                <LinkedinIcon size={16} round />
                <span className="text-sm">LinkedIn</span>
              </div>
            </LinkedinShareButton>

            <WhatsappShareButton url={shareUrl} title={shareTitle}>
              <div className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors w-full justify-center">
                <WhatsappIcon size={16} round />
                <span className="text-sm">WhatsApp</span>
              </div>
            </WhatsappShareButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
