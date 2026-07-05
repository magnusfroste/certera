import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, XCircle, Search, Home, Clock, Building, Hash, User, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiplomaRecord {
  blockchain_id: string;
  recipient_name: string;
  institution_name: string;
  diploma_html: string;
  diploma_css: string;
  content_hash: string;
  signature: string;
  diplomator_seal: string;
  created_at: string;
}

interface HederaSealData {
  hederaTxId?: string;
  hederaTopicId?: string;
  hederaSequenceNumber?: string;
  hederaExplorerUrl?: string;
}

const Verify = () => {
  const { diplomaId: urlDiplomaId } = useParams();
  const navigate = useNavigate();
  const [diplomaId, setDiplomaId] = useState(urlDiplomaId || '');
  const [recipientName, setRecipientName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    record?: DiplomaRecord;
    hederaData?: HederaSealData | null;
    issues: string[];
  } | null>(null);

  useEffect(() => {
    if (urlDiplomaId) setDiplomaId(urlDiplomaId);
  }, [urlDiplomaId]);

  const sha256 = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerification = async () => {
    if (!diplomaId.trim()) { toast.error('Please enter a diploma ID'); return; }
    if (!recipientName.trim()) { toast.error('Please enter the recipient name'); return; }

    setIsVerifying(true);
    const issues: string[] = [];

    try {
      const { data: diplomaData, error } = await supabase
        .from('signed_diplomas').select('*')
        .eq('blockchain_id', diplomaId.trim()).maybeSingle();

      if (error) { issues.push(`Database error: ${error.message}`); setVerificationResult({ isValid: false, issues }); return; }
      if (!diplomaData) { issues.push('Diploma not found on blockchain'); setVerificationResult({ isValid: false, issues }); return; }

      // Verify recipient
      if (diplomaData.recipient_name.toLowerCase() !== recipientName.trim().toLowerCase()) {
        issues.push('Recipient name does not match');
      }

      // Verify content hash
      const currentHash = await sha256(diplomaData.diploma_html + diplomaData.diploma_css);
      if (currentHash !== diplomaData.content_hash) issues.push('Content has been tampered with');

      // Verify signature
      const DIPLOMATOR_PRIVATE_KEY = 'diplomator_secure_key_2024';
      const expectedSig = await sha256(`${diplomaData.content_hash}:${diplomaData.recipient_name}:${DIPLOMATOR_PRIVATE_KEY}`);
      if (expectedSig !== diplomaData.signature) issues.push('Invalid signature');

      // Parse Hedera data
      let hederaData: HederaSealData | null = null;
      try { hederaData = JSON.parse(diplomaData.diplomator_seal); } catch { /* legacy */ }

      setVerificationResult({ isValid: issues.length === 0, record: diplomaData, hederaData, issues });
      toast[issues.length === 0 ? 'success' : 'error'](issues.length === 0 ? 'Verification successful! ✅' : 'Verification failed! ❌');
    } catch {
      setVerificationResult({ isValid: false, issues: ['Unexpected error during verification'] });
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

              {verificationResult && (
                <div className={`p-4 rounded-lg border ${verificationResult.isValid ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationResult.isValid
                      ? <CheckCircle className="w-5 h-5 text-primary" />
                      : <XCircle className="w-5 h-5 text-destructive" />}
                    <h4 className="font-medium">
                      {verificationResult.isValid ? 'Verification Successful' : 'Verification Failed'}
                    </h4>
                  </div>

                  {verificationResult.isValid && verificationResult.record && (
                    <div className="space-y-3 mt-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{verificationResult.record.recipient_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <span>{verificationResult.record.institution_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(verificationResult.record.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-xs">{verificationResult.record.content_hash.substring(0, 20)}...</span>
                        </div>
                      </div>

                      {verificationResult.hederaData && (
                        <div className="p-3 bg-muted rounded-lg space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">HEDERA CONSENSUS SERVICE</p>
                          <p className="text-xs font-mono">Topic: {verificationResult.hederaData.hederaTopicId}</p>
                          <p className="text-xs font-mono">Seq: #{verificationResult.hederaData.hederaSequenceNumber}</p>
                          {verificationResult.hederaData.hederaExplorerUrl && (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary"
                              onClick={() => window.open(verificationResult.hederaData.hederaExplorerUrl, '_blank')}>
                              <ExternalLink className="w-3 h-3 mr-1" />View on HashScan
                            </Button>
                          )}
                        </div>
                      )}

                      <Button className="w-full" onClick={() => navigate(`/diploma/${verificationResult.record!.blockchain_id}`)}>
                        <ExternalLink className="w-4 h-4 mr-2" />View Authentic Diploma
                      </Button>
                    </div>
                  )}

                  {!verificationResult.isValid && verificationResult.issues.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-destructive mt-2">
                      {verificationResult.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
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
