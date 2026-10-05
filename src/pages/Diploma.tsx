import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Calendar, Check, CheckCircle2, ChevronDown, Copy, Download, ExternalLink, Hash, QrCode, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { DiplomaFrame } from '@/components/DiplomaFrame';
import { toast } from 'sonner';
import { SITE_URL } from '@/lib/siteUrl';

interface SealData {
  hederaTxId?: string;
  hederaTopicId?: string;
  hederaSequenceNumber?: number;
  hederaExplorerUrl?: string;
}

const parseSeal = (raw: string): SealData | null => {
  try { return JSON.parse(raw) as SealData; } catch { return null; }
};

const diplomaLocale = (html: string) => {
  const language = html.match(/<html[^>]*\blang=["']([^"']+)["']/i)?.[1];
  return language?.toLowerCase().startsWith('en') ? 'en-US' : language || 'sv-SE';
};

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

const getExplorerUrl = (seal: SealData | null) => {
  if (seal?.hederaExplorerUrl) return seal.hederaExplorerUrl;
  if (!seal?.hederaTxId) return null;
  return `https://hashscan.io/testnet/transaction/${encodeURIComponent(seal.hederaTxId.replace('@', '-'))}`;
};

const Diploma = () => {
  const { diplomaId } = useParams();
  const [diplomaData, setDiplomaData] = useState<Tables<'signed_diplomas'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!diplomaId) { setError('Diploma not found'); setIsLoading(false); return; }
    const fetchDiploma = async () => {
      const { data, error: queryError } = await supabase
        .from('signed_diplomas')
        .select('*')
        .eq('blockchain_id', diplomaId)
        .maybeSingle();
      if (queryError) setError(`Database error: ${queryError.message}`);
      else if (!data) setError('Diploma not found');
      else setDiplomaData(data);
      setIsLoading(false);
    };
    void fetchDiploma();
  }, [diplomaId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy link'); }
  };

  const prepared = useMemo(() => {
    if (!diplomaData) return null;
    const seal = parseSeal(diplomaData.diplomator_seal);
    return {
      seal,
      explorerUrl: getExplorerUrl(seal),
      verificationUrl: `${SITE_URL}/verify/${diplomaData.blockchain_id}`,
      date: formatDate(diplomaData.created_at, diplomaLocale(diplomaData.diploma_html)),
    };
  }, [diplomaData]);

  if (isLoading) return (
    <main className="min-h-screen bg-muted flex items-center justify-center">
      <div className="text-center"><Award className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" /><p className="text-muted-foreground">Loading diploma…</p></div>
    </main>
  );

  if (error || !diplomaData || !prepared) return (
    <main className="min-h-screen bg-muted flex items-center justify-center p-4 text-center">
      <div><Award className="w-10 h-10 text-destructive mx-auto mb-3" /><h1 className="text-xl font-semibold">Diploma Not Found</h1><p className="text-muted-foreground mt-1">{error}</p></div>
    </main>
  );

  return (
    <div className="min-h-screen bg-muted text-foreground">
      <header className="border-b bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <Link to="/" className="font-semibold">certera.ink</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto overflow-hidden shadow-lg">
          <DiplomaFrame
            html={diplomaData.diploma_html}
            css={diplomaData.diploma_css}
            title={`Diploma for ${diplomaData.recipient_name}`}
            minHeight={180}
            fitToWidth
          />
        </div>

        <section aria-label="Diploma verification" className="mx-auto max-w-4xl py-5 sm:py-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-success" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold">Authentic diploma</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{diplomaData.institution_name}</span><span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{prepared.date}</span><span aria-hidden="true">·</span>
                {prepared.explorerUrl ? (
                  <a className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-primary" href={prepared.explorerUrl} target="_blank" rel="noreferrer">
                    Registered on Hedera <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : <span>Registered on Hedera</span>}
              </p>
            </div>
          </div>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-3 border-t pt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" aria-label="Show blockchain details">
                <Shield className="h-4 w-4" /> Show details
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <dl className="mt-2 grid gap-2 rounded-md border bg-background p-3 text-xs sm:grid-cols-[7rem_1fr]">
                <dt className="text-muted-foreground">Content hash</dt><dd className="break-all font-mono">{diplomaData.content_hash}</dd>
                {prepared.seal?.hederaTxId && <><dt className="text-muted-foreground">Transaction</dt><dd className="break-all font-mono">{prepared.seal.hederaTxId}</dd></>}
                {prepared.seal?.hederaTopicId && <><dt className="text-muted-foreground">Topic</dt><dd className="break-all font-mono">{prepared.seal.hederaTopicId}</dd></>}
              </dl>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" aria-label="Diploma actions">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="outline" size="sm" asChild><Link to={`/verify/${diplomaData.blockchain_id}`}><Shield />Verify</Link></Button>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="Show verification QR code"><QrCode />QR</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <QRCodeGenerator value={prepared.verificationUrl} size={160} level="M" />
                <p className="mt-2 text-center text-xs text-muted-foreground">Scan to verify</p>
              </PopoverContent>
            </Popover>
            {diplomaData.diploma_url && (
              <Button variant="outline" size="sm" asChild><a href={diplomaData.diploma_url} download><Download />Download</a></Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Diploma;