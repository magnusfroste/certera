import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string; client_name?: string; redirect_uri?: string };
  scope?: string;
  scopes?: string;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your identity",
  email: "Share your email address",
  profile: "Share your basic profile",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("This connection request is missing or invalid.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError("This connection request has expired or is invalid.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("Could not reach the authorization service. Please try again.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) throw new Error();
      window.location.href = target;
    } catch {
      setBusy(false);
      setError(approve ? "Could not approve the connection. Please try again." : "Could not cancel the connection. Please try again.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An app";
  const scopes: string[] = String(details?.scope ?? details?.scopes ?? "").split(/[\s,]+/).filter(Boolean);
  const redirect = details?.redirect_uri ?? details?.client?.redirect_uri;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-border rounded-2xl bg-card p-6 space-y-5">
        <div className="flex justify-center">
          <div className="bg-primary/15 border border-primary/20 p-3 rounded-2xl">
            <Award className="w-7 h-7 text-primary" />
          </div>
        </div>
        {error && !details ? (
          <p role="alert" className="text-sm text-center text-destructive">{error}</p>
        ) : !details ? (
          <p className="text-sm text-center text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-foreground">Connect {clientName} to certera.ink</h1>
              <p className="text-sm text-muted-foreground">This lets {clientName} use certera.ink as you.</p>
            </div>
            {email && <p className="text-xs text-center text-muted-foreground">Signed in as <span className="text-foreground">{email}</span></p>}
            <ul className="text-sm space-y-1 text-foreground">
              <li>• View your signed diplomas and design sessions</li>
              {scopes.map((s) => <li key={s}>• {SCOPE_LABELS[s] ?? `Additional permission requested: ${s}`}</li>)}
            </ul>
            {redirect && <p className="text-xs text-muted-foreground break-all">Returns to: {redirect}</p>}
            <p className="text-xs text-muted-foreground">This does not bypass certera.ink's permissions.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
