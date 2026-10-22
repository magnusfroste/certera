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
import { Users, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  error?: string;
}

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

        await signDiplomaToBlockchain(
          personalizedHtml,
          diplomaCss,
          name,
          institutionName
        );
        allResults.push({ name, success: true });
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
                <span className="flex-1">{r.name}</span>
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
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
