// Real Hedera-backed diploma verification.
//
// The trust anchor is the Hedera Consensus Service (HCS) message submitted at
// signing time — NOT the Supabase row. We fetch the actual on-chain message
// from the public mirror node and compare the hashes it carries against values
// recomputed from the diploma, so tampering with the database is detectable and
// anyone can verify independently (the mirror node is a public, CORS-enabled API).
import { supabase } from '@/integrations/supabase/client';

export interface VerifyCheck {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
}

export interface VerifiedRecord {
  blockchain_id: string;
  recipient_name: string;
  institution_name: string;
  content_hash: string;
  created_at: string;
}

export interface HcsRecord {
  topicId: string;
  sequenceNumber: string;
  consensusTimestamp?: string;
  explorerUrl?: string;
}

export interface VerifyResult {
  verified: boolean;
  /** True when we actually consulted the Hedera ledger (not just the DB). */
  onChainVerified: boolean;
  record?: VerifiedRecord;
  checks: VerifyCheck[];
  hcs?: HcsRecord | null;
  note?: string;
  error?: string;
}

const sha256 = async (data: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const normalizeName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');

interface SealData {
  hederaTopicId?: string;
  hederaSequenceNumber?: string;
  hederaExplorerUrl?: string;
}

interface OnChainMessage {
  contentHash?: string;
  recipientNameHash?: string;
  institutionName?: string;
  diplomaId?: string;
}

// Pick the mirror node that matches the network the diploma was signed on.
// hedera-sign uses testnet today; the stored explorer URL tells us if that changes.
const mirrorBaseFor = (explorerUrl?: string): string =>
  explorerUrl?.includes('mainnet')
    ? 'https://mainnet-public.mirrornode.hedera.com/api/v1'
    : 'https://testnet.mirrornode.hedera.com/api/v1';

const decodeBase64Utf8 = (b64: string): string => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Fetch the exact HCS message that was submitted for this diploma. */
async function fetchHcsMessage(
  base: string,
  topicId: string,
  seq: string,
): Promise<{ msg: OnChainMessage; consensusTimestamp?: string } | null> {
  const url = `${base}/topics/${topicId}/messages/${seq}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mirror node ${res.status}`);
  const data = await res.json();
  if (!data?.message) return null;
  const json = decodeBase64Utf8(data.message);
  return { msg: JSON.parse(json) as OnChainMessage, consensusTimestamp: data.consensus_timestamp };
}

export async function verifyDiploma(diplomaId: string, recipientNameInput: string): Promise<VerifyResult> {
  const { data: row, error } = await supabase
    .from('signed_diplomas')
    .select('blockchain_id, recipient_name, institution_name, diploma_html, diploma_css, content_hash, diplomator_seal, created_at')
    .eq('blockchain_id', diplomaId.trim())
    .maybeSingle();

  if (error) return { verified: false, onChainVerified: false, checks: [], error: `Database error: ${error.message}` };
  if (!row) return { verified: false, onChainVerified: false, checks: [], error: 'No diploma found for that ID.' };

  const record: VerifiedRecord = {
    blockchain_id: row.blockchain_id,
    recipient_name: row.recipient_name,
    institution_name: row.institution_name,
    content_hash: row.content_hash,
    created_at: row.created_at,
  };

  const checks: VerifyCheck[] = [];

  // 1. Recipient the verifier typed matches the recorded recipient (tolerant).
  const nameMatch = normalizeName(row.recipient_name) === normalizeName(recipientNameInput);
  checks.push({
    key: 'recipient',
    label: 'Recipient name matches the record',
    ok: nameMatch,
    detail: nameMatch ? undefined : 'The name entered does not match this diploma.',
  });

  // Recompute the content hash from the stored diploma.
  const recomputedContentHash = await sha256(row.diploma_html + row.diploma_css);

  // Parse the stored Hedera pointers.
  let seal: SealData = {};
  try { seal = JSON.parse(row.diplomator_seal) as SealData; } catch { /* legacy row */ }
  const topicId = seal.hederaTopicId;
  const seq = seal.hederaSequenceNumber;

  let onChainVerified = false;
  let hcs: HcsRecord | null = null;
  let note: string | undefined;

  if (topicId && seq) {
    const base = mirrorBaseFor(seal.hederaExplorerUrl);
    try {
      const fetched = await fetchHcsMessage(base, topicId, String(seq));
      if (!fetched) throw new Error('Empty on-chain message');
      const { msg, consensusTimestamp } = fetched;
      onChainVerified = true;
      hcs = {
        topicId,
        sequenceNumber: String(seq),
        consensusTimestamp,
        explorerUrl: seal.hederaExplorerUrl,
      };

      // 2. The diploma content matches the hash recorded on Hedera (tamper-evidence).
      const contentOnChain = !!msg.contentHash && msg.contentHash === recomputedContentHash;
      checks.push({
        key: 'content',
        label: 'Diploma content matches the Hedera record',
        ok: contentOnChain,
        detail: contentOnChain ? undefined : 'The diploma content differs from what was recorded on-chain — it may have been altered.',
      });

      // 3. The recorded recipient matches the hash on Hedera (DB integrity).
      const recipientHash = await sha256(row.recipient_name);
      const recipientOnChain = !!msg.recipientNameHash && msg.recipientNameHash === recipientHash;
      checks.push({
        key: 'recipient-chain',
        label: 'Recipient matches the Hedera record',
        ok: recipientOnChain,
        detail: recipientOnChain ? undefined : 'The recorded recipient does not match the on-chain record.',
      });
    } catch (e) {
      note = 'Could not reach the Hedera mirror node right now — showing the database record only. Try again shortly.';
      // Fall back to DB-only content integrity below.
    }
  } else {
    note = 'This diploma predates on-chain verification, so it is checked against the database record only.';
  }

  if (!onChainVerified) {
    // Fallback: at least confirm the stored content still hashes to the stored hash.
    const contentDbOk = recomputedContentHash === row.content_hash;
    checks.push({
      key: 'content-db',
      label: 'Diploma content matches the stored hash',
      ok: contentDbOk,
      detail: contentDbOk ? undefined : 'The diploma content differs from its stored hash — it may have been altered.',
    });
  }

  const verified = checks.every((c) => c.ok);
  return { verified, onChainVerified, record, checks, hcs, note };
}
