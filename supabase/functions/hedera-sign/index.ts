import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { submitDiplomaToHedera } from "../_shared/hederaSubmit.ts";
import { chooseIssuerDomain } from "../_shared/issuerDomain.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Signing spends the operator account's HBAR — require an authenticated user.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { contentHash, recipientName, institutionName, diplomaId } = await req.json();

    if (!contentHash || !recipientName || !institutionName || !diplomaId) {
      throw new Error('Missing required fields: contentHash, recipientName, institutionName, diplomaId');
    }

    // The organisation domain behind this signature, from the verified account —
    // never from the request body. Null when there is none (personal email, no
    // DNS-verified domain).
    // A domain proven with a DNS record (issuer-domain function) wins over the
    // email's: verifying one is an explicit choice to issue as that organisation.
    const lookupAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: dnsRow } = await lookupAdmin.from('issuer_domains')
      .select('domain').eq('user_id', user.id).not('verified_at', 'is', null).maybeSingle();
    const issuerDomain = chooseIssuerDomain(dnsRow?.domain, user.email, Boolean(user.email_confirmed_at));

    const seal = await submitDiplomaToHedera({ diplomaId, contentHash, recipientName, institutionName, issuerDomain });

    // Record the signature server-side; signed_diplomas only accepts rows that match it
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: recordError } = await admin.from('hedera_signatures').insert({
      diploma_id: diplomaId,
      issuer_id: user.id,
      content_hash: contentHash,
      seal,
      issuer_domain: issuerDomain,
    });
    if (recordError) throw new Error('Failed to record signature: ' + recordError.message);

    return new Response(JSON.stringify({
      success: true,
      transactionId: seal.hederaTxId,
      topicId: seal.hederaTopicId,
      sequenceNumber: seal.hederaSequenceNumber,
      consensusTimestamp: new Date().toISOString(),
      explorerUrl: seal.hederaExplorerUrl,
      txExplorerUrl: seal.hederaTxExplorerUrl,
      issuerDomain,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Hedera signing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
