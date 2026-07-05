import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Award, ExternalLink, Shield, Calendar, QrCode, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { DiplomaFrame } from '@/components/DiplomaFrame';
import { toast } from 'sonner';

interface SealData {
  hederaTxId?: string;
  hederaTopicId?: string;
  hederaSequenceNumber?: number;
}

const parseSeal = (raw: string): SealData | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const Diploma = () => {
  const { diplomaId } = useParams();
  const [diplomaData, setDiplomaData] = useState<Tables<'signed_diplomas'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sealOpen, setSealOpen] = useState(false);

  useEffect(() => {
    if (!diplomaId) return;
    const fetchDiplomaData = async () => {
      try {
        const { data, error } = await supabase
          .from('signed_diplomas')
          .select('*')
          .eq('blockchain_id', diplomaId)
          .maybeSingle();

        if (error) { setError(`Database error: ${error.message}`); return; }
        if (!data) { setError('Diploma not found'); return; }
        setDiplomaData(data);
      } catch {
        setError('Unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiplomaData();
  }, [diplomaId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Award className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground">Loading diploma…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Award className="w-8 h-8 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">Diploma Not Found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const verificationUrl = `${window.location.origin}/verify/${diplomaData.blockchain_id}`;
  const seal = parseSeal(diplomaData.diplomator_seal);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">certera.ink</span>
          </div>
          <Badge variant="secondary">
            <Shield className="w-3 h-3 mr-1" />
            Blockchain Verified
          </Badge>
        </div>
      </header>

      {/* Diploma hero */}
      <main className="flex-1 flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl space-y-4">
          <div className="bg-card rounded-lg shadow-lg border overflow-hidden">
            <DiplomaFrame
              html={diplomaData.diploma_html}
              css={diplomaData.diploma_css}
              title={`Diploma for ${diplomaData.recipient_name}`}
            />
          </div>

          {/* Blockchain details collapsible */}
          {seal && (
            <Collapsible open={sealOpen} onOpenChange={setSealOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
                  <Shield className="w-3 h-3" />
                  Blockchain details
                  <ChevronDown className={`w-3 h-3 transition-transform ${sealOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-md border bg-muted/50 p-3 text-xs font-mono space-y-1 max-w-lg mx-auto">
                  {seal.hederaTopicId && <p><span className="text-muted-foreground">Topic:</span> {seal.hederaTopicId}</p>}
                  {seal.hederaTxId && <p><span className="text-muted-foreground">Tx:</span> {seal.hederaTxId}</p>}
                  {seal.hederaSequenceNumber != null && <p><span className="text-muted-foreground">Seq:</span> {seal.hederaSequenceNumber}</p>}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </main>

      {/* Footer action bar */}
      <footer className="border-t bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{diplomaData.recipient_name}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{diplomaData.institution_name}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(diplomaData.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(verificationUrl, '_blank')}
            >
              <Shield className="w-3 h-3 mr-1" />
              Verify
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <QrCode className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <QRCodeGenerator value={verificationUrl} size={160} level="M" />
                <p className="text-xs text-muted-foreground text-center mt-2">Scan to verify</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Diploma;
