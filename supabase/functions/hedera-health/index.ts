// Health check for the Hedera signing path. Performs the same steps as
// hedera-sign (same SDK version, operator key, topic create + message submit)
// on the configured network (HEDERA_NETWORK) and reports timings. Protected by a secret in internal_secrets.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hederaConfig, parsePrivateKey } from "../_shared/hedera.ts";

const SDK_VERSION = "2.51.0";

serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const secret = req.headers.get("x-health-secret");
  const { data: ok } = secret
    ? await admin.rpc("is_valid_internal_secret", { p_name: "health_secret", p_secret: secret })
    : { data: false };
  if (!ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  const steps: Record<string, unknown> = { sdk: SDK_VERSION };
  const t0 = Date.now();
  try {
    const { Client, TopicCreateTransaction, TopicMessageSubmitTransaction, PrivateKey } =
      await import("npm:@hashgraph/sdk@2.51.0"); // keep in sync with hedera-sign
    const hedera = hederaConfig();
    steps.network = hedera.network;
    const accountId = hedera.accountId;
    const rawKey = hedera.privateKey;
    steps.credentials = Boolean(accountId && rawKey);
    if (!accountId || !rawKey) throw new Error("Hedera credentials not configured");

    const key = parsePrivateKey(PrivateKey, rawKey);
    const client = (hedera.network === "mainnet" ? Client.forMainnet() : Client.forTestnet()).setOperator(accountId, key);
    steps.topicIdEnv = Boolean(hedera.topicId);

    const topicTx = await new TopicCreateTransaction().setTopicMemo("certera.ink - health check").execute(client);
    const topicId = (await topicTx.getReceipt(client)).topicId!.toString();
    steps.topicCreated = { topicId, ms: Date.now() - t0 };

    const t1 = Date.now();
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify({ type: "HEALTH_CHECK", at: new Date().toISOString() }))
      .execute(client);
    const receipt = await submitTx.getReceipt(client);
    steps.messageSubmitted = {
      status: receipt.status.toString(),
      sequence: receipt.topicSequenceNumber?.toString(),
      txId: submitTx.transactionId?.toString(),
      explorer: `${hedera.explorerBase}/topic/${topicId}`,
      ms: Date.now() - t1,
    };
    client.close();
    return new Response(JSON.stringify({ ok: true, totalMs: Date.now() - t0, steps }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), steps }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
