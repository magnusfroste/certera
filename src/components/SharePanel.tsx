import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check, QrCode, Loader2, Mail, Linkedin, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useDiploma } from '@/contexts/DiplomaContext';
import { useSignedDiploma } from '@/hooks/useSignedDiploma';
import { toast } from 'sonner';
import { downloadDiplomaPdf } from '@/lib/diplomaPdf';
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
      await downloadDiplomaPdf({
        html: previewHtml(diplomaHtml, signingRecipientName),
        css: diplomaCss,
        diplomaId: currentDiplomaId || undefined,
        verificationUrl: currentDiplomaId ? `${SITE_URL}/verify/${currentDiplomaId}` : undefined,
      });
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
