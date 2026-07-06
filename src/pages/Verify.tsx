import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, XCircle, Search, Home, Clock, Building, Hash, User, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { verifyDiploma, type VerifyResult } from '@/services/hederaVerification';

const Verify = () => {
  const { diplomaId: urlDiplomaId } = useParams();
  const navigate = useNavigate();
  const [diplomaId, setDiplomaId] = useState(urlDiplomaId || '');
  const [recipientName, setRecipientName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (urlDiplomaId) setDiplomaId(urlDiplomaId);
  }, [urlDiplomaId]);

  const handleVerification = async () => {
    if (!diplomaId.trim()) { toast.error('Please enter a diploma ID'); return; }
    if (!recipientName.trim()) { toast.error('Please enter the recipient name'); return; }

    setIsVerifying(true);
    try {
      const res = await verifyDiploma(diplomaId, recipientName);
      setResult(res);
      if (res.error) toast.error(res.error);
      else toast[res.verified ? 'success' : 'error'](res.verified ? 'Verification successful! ✅' : 'Verification failed! ❌');
    } catch {
      setResult({ verified: false, onChainVerified: false, checks: [], error: 'Unexpected error during verification' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Diploma Verification</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Verify diploma authenticity on Hedera blockchain
          </p>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
            <Home className="w-4 h-4 mr-2" />Back to certera.ink
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Verify Diploma</CardTitle>
              <p className="text-sm text-muted-foreground">Enter the diploma ID and recipient name</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="diplomaId">Diploma ID</Label>
                <Input id="diplomaId" value={diplomaId} onChange={(e) => setDiplomaId(e.target.value)}
                  placeholder="DIP_xxxxx_xxxxxx" disabled={isVerifying} />
              </div>
              <div>
                <Label htmlFor="recipientName">Recipient Name</Label>
                <Input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Exactly as shown on diploma" disabled={isVerifying} />
              </div>

              <Button onClick={handleVerification} disabled={isVerifying} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                {isVerifying ? 'Verifying on Hedera...' : 'Verify on Blockchain'}
              </Button>

              {result && (
                <div className={`p-4 rounded-lg border ${result.error ? 'bg-destructive/10 border-destructive/20' : result.verified ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {result.verified && !result.error
                      ? <CheckCircle className="w-5 h-5 text-primary" />
                      : <XCircle className="w-5 h-5 text-destructive" />}
                    <h4 className="font-medium">
                      {result.error ? 'Could Not Verify' : result.verified ? 'Verification Successful' : 'Verification Failed'}
                    </h4>
                  </div>

                  {result.error && <p className="text-sm text-destructive mt-1">{result.error}</p>}

                  {!result.error && (
                    <>
                      {/* On-chain vs database-only badge */}
                      <div className="flex items-center gap-1.5 text-xs mb-3">
                        <Link2 className="w-3.5 h-3.5" />
                        {result.onChainVerified ? (
                          <span className="text-primary font-medium">Verified against the Hedera ledger</span>
                        ) : (
                          <span className="text-muted-foreground">Checked against the database record only</span>
                        )}
                      </div>

                      {/* Per-check breakdown */}
                      <ul className="space-y-1.5 mb-3">
                        {result.checks.map((c) => (
                          <li key={c.key} className="flex items-start gap-2 text-sm">
                            {c.ok
                              ? <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              : <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                            <span className={c.ok ? '' : 'text-destructive'}>
                              {c.label}{c.detail ? ` — ${c.detail}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {result.note && <p className="text-xs text-muted-foreground mb-3">{result.note}</p>}

                      {result.record && (
                        <div className="space-y-2 text-sm border-t border-border pt-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{result.record.recipient_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span>{result.record.institution_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{new Date(result.record.created_at).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-xs">{result.record.content_hash.substring(0, 20)}…</span>
                          </div>
                        </div>
                      )}

                      {result.hcs && (
                        <div className="p-3 bg-muted rounded-lg space-y-1.5 mt-3">
                          <p className="text-xs font-medium text-muted-foreground">HEDERA CONSENSUS SERVICE</p>
                          <p className="text-xs font-mono break-all">Topic: {result.hcs.topicId}</p>
                          <p className="text-xs font-mono">Seq: #{result.hcs.sequenceNumber}</p>
                          {result.hcs.consensusTimestamp && (
                            <p className="text-xs font-mono">Consensus: {result.hcs.consensusTimestamp}</p>
                          )}
                          {result.hcs.explorerUrl && (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary"
                              onClick={() => window.open(result.hcs!.explorerUrl, '_blank')}>
                              <ExternalLink className="w-3 h-3 mr-1" />View on HashScan
                            </Button>
                          )}
                        </div>
                      )}

                      {result.verified && result.record && (
                        <Button className="w-full mt-3" onClick={() => navigate(`/diploma/${result.record!.blockchain_id}`)}>
                          <ExternalLink className="w-4 h-4 mr-2" />View Authentic Diploma
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border bg-card">
          <CardHeader>
            <CardTitle>How Hedera Verification Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Hedera Consensus</h3>
                <p className="text-sm text-muted-foreground">
                  Diploma hash is submitted to Hedera Consensus Service, creating an immutable on-chain record.
                </p>
              </div>
              <div className="text-center">
                <Hash className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Content Integrity</h3>
                <p className="text-sm text-muted-foreground">
                  SHA-256 hash ensures any tampering is immediately detectable.
                </p>
              </div>
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Public Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Anyone can verify on HashScan explorer — no account needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Verify;
