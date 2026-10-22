import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, ExternalLink, Loader2, Users } from 'lucide-react';
import { useDiploma } from '@/contexts/DiplomaContext';
import { signDiplomaToBlockchain, createDiplomaUrl, DiplomaRecord } from '@/services/blockchainService';
import { toast } from 'sonner';
import { BulkSignDialog } from '@/components/BulkSignDialog';
import { personalizeHtml } from '@/lib/recipient';

export const BlockchainSigner = () => {
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
  const [diplomaUrl, setDiplomaUrl] = useState('');
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
      setDiplomaUrl(createDiplomaUrl(record.id));
      toast.success('Diploma signed on Hedera blockchain!');
    } catch (error) {
      console.error('Signing error:', error);
      toast.error('Failed to sign: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSigningTx(false);
    }
  };

  const hasContent = diplomaHtml && diplomaCss;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Shield className="w-5 h-5 text-primary" />
          Hedera Blockchain Verification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sign your diploma to Hedera Consensus Service for tamper-proof on-chain verification
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!signedRecord ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Name</Label>
                <Input id="recipient" value={signingRecipientName}
                  onChange={(e) => setSigningRecipientName(e.target.value)}
                  placeholder="Enter recipient's full name" disabled={isSigningTx} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution Name</Label>
                <Input id="institution" value={signingInstitutionName}
                  onChange={(e) => setSigningInstitutionName(e.target.value)}
                  placeholder="Enter institution name" disabled={isSigningTx} />
              </div>
            </div>

            <Button onClick={handleSignToBlockchain}
              disabled={!hasContent || isSigningTx || !signingRecipientName.trim() || !signingInstitutionName.trim()}
              className="w-full">
              {isSigningTx ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing on Hedera...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Sign on Hedera Blockchain</>
              )}
            </Button>

            <Button variant="outline" onClick={() => setBulkOpen(true)}
              disabled={!hasContent || isSigningTx || !signingInstitutionName.trim()}
              className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Bulk Sign for Multiple Recipients
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
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h4 className="font-medium text-foreground">Signed on Hedera!</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Your diploma is now immutably recorded on Hedera Consensus Service.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">DIPLOMA ID</Label>
                <div className="text-sm bg-muted px-3 py-2 rounded font-mono mt-1 text-foreground">
                  {signedRecord.id}
                </div>
              </div>

              {signedRecord.hederaTxId && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">HEDERA TX ID</Label>
                  <div className="text-sm bg-muted px-3 py-2 rounded font-mono mt-1 text-foreground break-all">
                    {signedRecord.hederaTxId}
                  </div>
                </div>
              )}

              {signedRecord.hederaTopicId && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">HCS TOPIC</Label>
                  <div className="text-sm bg-muted px-3 py-2 rounded font-mono mt-1 text-foreground">
                    {signedRecord.hederaTopicId} (seq #{signedRecord.hederaSequenceNumber})
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs font-medium text-muted-foreground">TIMESTAMP</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {new Date(signedRecord.timestamp).toLocaleString()}
                </div>
              </div>

              {signedRecord.hederaExplorerUrl && (
                <Button variant="outline" className="w-full"
                  onClick={() => window.open(signedRecord.hederaExplorerUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on HashScan Explorer
                </Button>
              )}

              <Button variant="outline" className="w-full"
                onClick={() => window.open(diplomaUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Signed Diploma
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => {
              setSignedRecord(null);
              setDiplomaUrl('');
              setSigningRecipientName('');
              setSigningInstitutionName('');
            }}>
              Sign Another Diploma
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
