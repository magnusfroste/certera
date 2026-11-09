import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, ExternalLink, Loader2, Users, BadgeCheck, CircleHelp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { chooseIssuerDomain } from '../../supabase/functions/_shared/issuerDomain';
import { Link } from 'react-router-dom';
import { useDiploma } from '@/contexts/DiplomaContext';
import { signDiplomaToBlockchain, DiplomaRecord } from '@/services/blockchainService';
import { toast } from 'sonner';
import { BulkSignDialog } from '@/components/BulkSignDialog';
import { personalizeHtml } from '@/lib/recipient';
import { useSignedDiploma } from '@/hooks/useSignedDiploma';

const SharePanel = lazy(() => import('@/components/SharePanel').then(m => ({ default: m.SharePanel }))); 

export const BlockchainSigner = () => {
  // What the signed diplomas will say about the issuer (decided server-side by
  // hedera-sign from the same rule) — shown before signing, not discovered after.
  const [issuer, setIssuer] = useState<{ domain: string | null; email: string } | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: dns } = await supabase.from('issuer_domains')
        .select('domain').not('verified_at', 'is', null).maybeSingle();
      setIssuer({ email: user.email, domain: chooseIssuerDomain(dns?.domain, user.email, Boolean(user.email_confirmed_at)) });
    })();
  }, []);
  const { 
    diplomaHtml, 
    diplomaCss,
    signingRecipientName,
    setSigningRecipientName,
    signingInstitutionName,
    setSigningInstitutionName
  } = useDiploma();
  
  const [isSigningTx, setIsSigningTx] = useState(false);
  const [signedRecord, setSignedRecord] = useState<DiplomaRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleSignToBlockchain = async () => {
    if (!signingRecipientName.trim() || !signingInstitutionName.trim()) {
      toast.error('Please fill in both recipient and institution names');
      return;
    }
    if (!diplomaHtml || !diplomaCss) {
      toast.error('No diploma content to sign. Please create a diploma first.');
      return;
    }

    setIsSigningTx(true);
    try {
      const record = await signDiplomaToBlockchain(
        personalizeHtml(diplomaHtml, signingRecipientName), diplomaCss,
        signingRecipientName.trim(), signingInstitutionName.trim()
      );
      setSignedRecord(record);
      toast.success('Diploma signed on Hedera blockchain!');
    } catch (error) {
      console.error('Signing error:', error);
      toast.error('Failed to sign: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSigningTx(false);
    }
  };

  const hasContent = diplomaHtml && diplomaCss;
  const existingSigned = useSignedDiploma();

  return (
    <section aria-label="Sign diploma" className="space-y-6">
      <div><h2 className="text-lg font-semibold">{signedRecord || existingSigned ? 'Your diploma is ready to share' : 'Make it official'}</h2>
        <p className="text-sm text-muted-foreground mt-1">{signedRecord || existingSigned ? 'Send the recipient a link to their verified achievement.' : 'Personalize your diploma, then record its authenticity on Hedera.'}</p>
      </div>
      <div className="space-y-4">
        {!signedRecord && !existingSigned ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient name</Label>
                <Input id="recipient" value={signingRecipientName}
                  onChange={(e) => setSigningRecipientName(e.target.value)}
                  placeholder="Enter recipient's full name" disabled={isSigningTx} aria-describedby="recipient-help" />
                <p id="recipient-help" className="text-xs text-muted-foreground leading-relaxed">This name will be written onto the diploma when you sign. Your preview updates as you type.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution name</Label>
                <Input id="institution" value={signingInstitutionName}
                  onChange={(e) => setSigningInstitutionName(e.target.value)}
                  placeholder="Enter institution name" disabled={isSigningTx} />
                {issuer && (issuer.domain ? (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                    <BadgeCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                    <span>Your diplomas will carry a <span className="text-foreground font-medium">Verified issuer · {issuer.domain}</span> stamp.</span>
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                    <CircleHelp className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>You are signed in with a personal address, so diplomas will show the issuer as not verified. To get a <span className="text-foreground font-medium">Verified issuer</span> stamp, <Link to="/profile" className="underline underline-offset-2 hover:text-foreground">verify your organisation's domain</Link> or sign up with your work email.</span>
                  </p>
                ))}
              </div>
            </div>

            <Button onClick={handleSignToBlockchain}
              disabled={!hasContent || isSigningTx || !signingRecipientName.trim() || !signingInstitutionName.trim()}
              className="w-full">
              {isSigningTx ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing on Hedera...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Sign on Hedera</>
              )}
            </Button>

            <Button variant="outline" onClick={() => setBulkOpen(true)}
              disabled={!hasContent || isSigningTx || !signingInstitutionName.trim()}
              className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Sign for multiple recipients
            </Button>

            <BulkSignDialog
              open={bulkOpen}
              onOpenChange={setBulkOpen}
              diplomaHtml={diplomaHtml}
              diplomaCss={diplomaCss}
              institutionName={signingInstitutionName.trim()}
            />

            {!hasContent && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  ⚠️ Create a diploma first before signing to blockchain
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <div role="status" className="flex gap-3 border-b border-border pb-5">
              <CheckCircle className="size-6 text-success shrink-0" />
              <div><h3 className="font-medium">Authentic diploma</h3><p className="text-sm text-muted-foreground mt-1">Registered on Hedera. Ready to share and verify.</p></div>
            </div>
            <Suspense fallback={<Loader2 className="size-5 animate-spin text-muted-foreground" />}><SharePanel compact /></Suspense>
            {signedRecord && <details className="text-xs text-muted-foreground border-t border-border pt-4">
              <summary className="cursor-pointer focus-visible:outline-ring">Registration details</summary>
              <dl className="space-y-2 mt-3 break-all"><dt>Diploma ID</dt><dd className="font-mono">{signedRecord.id}</dd><dt>Signed</dt><dd>{new Date(signedRecord.timestamp).toLocaleString('en-GB')}</dd></dl>
              {signedRecord.hederaExplorerUrl && <Button size="sm" variant="ghost" asChild><a href={signedRecord.hederaExplorerUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3 mr-2" />View on HashScan</a></Button>}
            </details>}
            <Button variant="ghost" className="w-full" onClick={() => {
              setSignedRecord(null);
              setSigningRecipientName('');
              setSigningInstitutionName('');
            }}>
              Sign Another Diploma
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
