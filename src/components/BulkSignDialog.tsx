import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Users, Loader2, CheckCircle, XCircle, AlertCircle, Copy, Download, ExternalLink } from 'lucide-react';
import { signDiplomaToBlockchain } from '@/services/blockchainService';
import { toast } from 'sonner';
import { personalizeHtml } from '@/lib/recipient';

interface BulkSignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diplomaHtml: string;
  diplomaCss: string;
  institutionName: string;
}

interface SignResult {
  name: string;
  success: boolean;
  /** Public diploma page — what the issuer sends to the recipient. */
  url?: string;
  error?: string;
}

/** One quoted CSV field (RFC 4180), with spreadsheet formula injection neutralised. */
const csvField = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const BulkSignDialog = ({
  open,
  onOpenChange,
  diplomaHtml,
  diplomaCss,
  institutionName,
}: BulkSignDialogProps) => {
  const [namesText, setNamesText] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [results, setResults] = useState<SignResult[]>([]);
  const [done, setDone] = useState(false);

  const parseNames = (text: string): string[] => {
    return text
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  };

  const names = parseNames(namesText);

  const handleBulkSign = async () => {
    if (names.length === 0) return;

    setIsSigning(true);
    setProgress(0);
    setTotal(names.length);
    setResults([]);
    setDone(false);

    const allResults: SignResult[] = [];

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      setCurrentName(name);
      setProgress(i);

      try {
        // Replace recipient name placeholder in HTML if present
        const personalizedHtml = personalizeHtml(diplomaHtml, name);

        const record = await signDiplomaToBlockchain(
          personalizedHtml,
          diplomaCss,
          name,
          institutionName
        );
        allResults.push({ name, success: true, url: record.diplomaUrl });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        allResults.push({ name, success: false, error: msg });
      }

      setResults([...allResults]);
    }

    setProgress(names.length);
    setCurrentName('');
    setIsSigning(false);
    setDone(true);

    const succeeded = allResults.filter((r) => r.success).length;
    const failed = allResults.filter((r) => !r.success).length;

    if (failed === 0) {
      toast.success(`All ${succeeded} diplomas signed successfully!`);
    } else {
      toast.warning(`${succeeded} signed, ${failed} failed`);
    }
  };

  const signed = results.filter((r) => r.success && r.url);

  // After signing, the issuer's next job is handing each person their link.
  const copyAllLinks = async () => {
    const text = signed.map((r) => `${r.name}\t${r.url}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${signed.length} link${signed.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Could not copy — use Download CSV instead');
    }
  };

  const downloadCsv = () => {
    const rows = [['Name', 'Diploma link'], ...signed.map((r) => [r.name, r.url!])];
    const csv = '\uFEFF' + rows.map((row) => row.map(csvField).join(',')).join('\r\n');
    const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = `${institutionName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'diplomas'}-links.csv`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const handleClose = () => {
    if (isSigning) return;
    setNamesText('');
    setResults([]);
    setDone(false);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Bulk Sign Diplomas
          </DialogTitle>
          <DialogDescription>
            Sign the same diploma template for multiple recipients. Each diploma
            is individually signed on Hedera.
          </DialogDescription>
        </DialogHeader>

        {!done ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Recipient Names{' '}
                <span className="text-muted-foreground font-normal">
                  (one per line)
                </span>
              </Label>
              <Textarea
                placeholder={"Alice Johnson\nBob Smith\nCarol Williams"}
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                rows={8}
                disabled={isSigning}
                className="font-mono text-sm"
              />
              {names.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {names.length} recipient{names.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>

            {isSigning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Signing: <span className="font-medium text-foreground">{currentName}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {progress}/{total}
                  </span>
                </div>
                <Progress value={(progress / total) * 100} />
              </div>
            )}

            <div className="p-3 bg-muted/50 border rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Institution: <strong>{institutionName || 'Not set'}</strong>.
                  Each diploma will be individually signed on the Hedera blockchain.
                  This may take a moment per recipient.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30"
              >
                {r.success ? (
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate">{r.name}</span>
                {r.success && r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                    aria-label={`Open the diploma for ${r.name}`}
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!r.success && (
                  <span className="text-xs text-destructive truncate max-w-[200px]">
                    {r.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {!done ? (
            <Button
              onClick={handleBulkSign}
              disabled={names.length === 0 || isSigning || !institutionName}
              className="w-full"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing {progress}/{total}...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Sign {names.length} Diploma{names.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          ) : (
            <div className="w-full space-y-2">
              {signed.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={copyAllLinks}>
                    <Copy className="w-4 h-4 mr-2" />Copy all links
                  </Button>
                  <Button variant="outline" onClick={downloadCsv}>
                    <Download className="w-4 h-4 mr-2" />Download CSV
                  </Button>
                </div>
              )}
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
