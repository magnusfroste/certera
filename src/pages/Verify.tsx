import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building, CheckCircle2, ExternalLink, Hash, Home, Search, Shield, User, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DiplomaFrame } from '@/components/DiplomaFrame';
import { verifyDiploma, type VerifyResult } from '@/services/hederaVerification';
import { toast } from 'sonner';

const diplomaLocale = (html?: string) => {
  const language = html?.match(/<html[^>]*\blang=["']([^"']+)["']/i)?.[1];
  return language?.toLowerCase().startsWith('en') ? 'en-US' : language || 'sv-SE';
};

const formatDate = (value: string, html?: string) =>
  new Intl.DateTimeFormat(diplomaLocale(html), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

const VerificationResult = ({ result, loading }: { result: VerifyResult | null; loading: boolean }) => {
  if (loading) return (
    <section className="border-b pb-8 text-center" aria-live="polite">
      <Shield className="mx-auto h-10 w-10 animate-pulse text-primary" />
      <p className="mt-3 text-muted-foreground">Verifying diploma on Hedera…</p>
    </section>
  );
  if (!result) return null;

  const authentic = result.verified && !result.error && result.record;
  if (!authentic) return (
    <section className="border-b pb-8 text-center" aria-live="polite">
      <XCircle className="mx-auto h-14 w-14 text-destructive" />
      <h2 className="mt-3 text-3xl font-semibold">Not found</h2>
      <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{result.error || 'This diploma could not be verified.'}</p>
    </section>
  );

  return (
    <section className="border-b pb-8" aria-live="polite">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h2 className="mt-3 text-3xl font-semibold">Authentic diploma</h2>
        <p className="mt-2 text-muted-foreground">Verified against its registered record{result.onChainVerified ? ' on Hedera' : ''}.</p>
      </div>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="overflow-hidden shadow-md">
          <DiplomaFrame html={result.record.diploma_html} css={result.record.diploma_css} title={`Diploma for ${result.record.recipient_name}`} minHeight={160} fitToWidth />
        </div>
        <div className="space-y-4 border-t pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div><p className="text-xs uppercase text-muted-foreground">Recipient</p><p className="mt-1 flex items-center gap-2 font-medium"><User className="h-4 w-4 text-muted-foreground" />{result.record.recipient_name}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Issuer</p><p className="mt-1 flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />{result.record.institution_name}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Issued</p><p className="mt-1">{formatDate(result.record.created_at, result.record.diploma_html)}</p></div>
          {result.hcs?.explorerUrl && <Button variant="outline" size="sm" asChild><a href={result.hcs.explorerUrl} target="_blank" rel="noreferrer"><ExternalLink />View on HashScan</a></Button>}
          <Button size="sm" asChild><Link to={`/diploma/${result.record.blockchain_id}`}>View diploma</Link></Button>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
        </div>
      </div>
    </section>
  );
};

const Verify = () => {
  const { diplomaId: urlDiplomaId } = useParams();
  const navigate = useNavigate();
  const [diplomaId, setDiplomaId] = useState(urlDiplomaId || '');
  const [recipientName, setRecipientName] = useState('');
  const [isVerifying, setIsVerifying] = useState(Boolean(urlDiplomaId));
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!urlDiplomaId) return;
    setDiplomaId(urlDiplomaId);
    setResult(null);
    setIsVerifying(true);
    let active = true;
    void verifyDiploma(urlDiplomaId).then((response) => { if (active) setResult(response); }).catch(() => {
      if (active) setResult({ verified: false, onChainVerified: false, checks: [], error: 'Unexpected error during verification' });
    }).finally(() => { if (active) setIsVerifying(false); });
    return () => { active = false; };
  }, [urlDiplomaId]);

  const handleVerification = async () => {
    if (!diplomaId.trim()) { toast.error('Please enter a diploma ID'); return; }
    if (!recipientName.trim()) { toast.error('Please enter the recipient name'); return; }
    setIsVerifying(true);
    setResult(null);
    try {
      const response = await verifyDiploma(diplomaId, recipientName);
      setResult(response);
      if (response.verified) toast.success('Diploma verified');
    } catch { setResult({ verified: false, onChainVerified: false, checks: [], error: 'Unexpected error during verification' }); }
    finally { setIsVerifying(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-semibold"><Shield className="h-5 w-5 text-primary" />certera.ink</Link>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}><Home />Home</Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <VerificationResult result={result} loading={isVerifying} />

        <section className="mx-auto max-w-xl py-8">
          <h1 className="text-2xl font-semibold">Verify another diploma</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the diploma ID and recipient name exactly as shown.</p>
          <div className="mt-5 space-y-4">
            <div><Label htmlFor="diplomaId">Diploma ID</Label><Input id="diplomaId" value={diplomaId} onChange={(event) => setDiplomaId(event.target.value)} placeholder="DIP_xxxxx_xxxxxx" disabled={isVerifying} /></div>
            <div><Label htmlFor="recipientName">Recipient name</Label><Input id="recipientName" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Exactly as shown on diploma" disabled={isVerifying} /></div>
            <Button onClick={handleVerification} disabled={isVerifying} className="w-full"><Search />{isVerifying ? 'Verifying…' : 'Verify diploma'}</Button>
          </div>
        </section>

        <section className="border-t py-8">
          <h2 className="text-xl font-semibold">How Hedera Verification Works</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div><Shield className="mb-3 h-7 w-7 text-primary" /><h3 className="font-semibold">Hedera Consensus</h3><p className="mt-1 text-sm text-muted-foreground">The diploma hash creates an immutable record on Hedera.</p></div>
            <div><Hash className="mb-3 h-7 w-7 text-primary" /><h3 className="font-semibold">Content Integrity</h3><p className="mt-1 text-sm text-muted-foreground">A SHA-256 hash reveals if diploma content has changed.</p></div>
            <div><CheckCircle2 className="mb-3 h-7 w-7 text-primary" /><h3 className="font-semibold">Public Verification</h3><p className="mt-1 text-sm text-muted-foreground">Anyone can verify the public record without an account.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Verify;