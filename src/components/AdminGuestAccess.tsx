import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  GUEST_ACCESS_KEY,
  MAX_GUEST_DAILY_LIMIT,
  isValidGuestDailyLimit,
  parseGuestDailyLimit,
} from '../../supabase/functions/_shared/guestAccess';

/** The free daily generation allowance for visitors without an account (app_settings.guest_access). */
export const AdminGuestAccess = () => {
  const [saved, setSaved] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', GUEST_ACCESS_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error('Could not load the guest limit');
        const limit = parseGuestDailyLimit(data?.value);
        setSaved(limit);
        setIsDefault(!data);
        setDraft(String(limit));
      });
  }, []);

  const parsed = Number(draft.trim());
  const valid = draft.trim() !== '' && isValidGuestDailyLimit(parsed);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: GUEST_ACCESS_KEY, value: { dailyLimit: parsed }, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    setSaved(parsed);
    setIsDefault(false);
    toast.success(parsed === 0 ? 'Guests now need an account to generate' : `Guests can generate ${parsed} per day`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserRoundCheck className="h-4 w-4" />
          Guest access
        </CardTitle>
        <CardDescription className="text-xs">
          How many diplomas a visitor can generate per day without an account. Signing, sharing and saving always
          need an account; signed-in users have no limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {saved === null ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="guest-limit">Free generations per day</Label>
                <Input
                  id="guest-limit"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_GUEST_DAILY_LIMIT}
                  step={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-32"
                  aria-invalid={!valid}
                />
              </div>
              <Button onClick={save} disabled={!valid || saving || parsed === saved} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
            {!valid && (
              <p className="text-xs text-destructive">Enter a whole number from 0 to {MAX_GUEST_DAILY_LIMIT}.</p>
            )}
            <p className="text-xs text-muted-foreground">
              {saved === 0
                ? 'Now: guests must create an account before generating.'
                : `Now: ${saved} per visitor per day${isDefault ? ` (default — no setting saved yet)` : ''}.`}{' '}
              0 requires an account. Counted per IP address on the server, so it cannot be reset by clearing the
              browser. Applies from the next request.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminGuestAccess;
