import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * A signed diploma as the public may see it: the columns the /diploma, /embed
 * and /verify pages render, and nothing that identifies the issuing account.
 */
export type PublicDiploma = Database['public']['Functions']['get_public_diploma']['Returns'][number];

/**
 * Look up one signed diploma by its id, for anyone (signed in or not).
 *
 * signed_diplomas is not readable directly by the public — that let anyone
 * list every diploma. The get_public_diploma database function returns exactly
 * one row by exact id, so a holder of a diploma link can view and verify it,
 * but nobody can enumerate the registry.
 */
export async function fetchPublicDiploma(
  blockchainId: string,
): Promise<{ data: PublicDiploma | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_public_diploma', { p_blockchain_id: blockchainId });
  if (error) return { data: null, error: error.message };
  return { data: data?.[0] ?? null, error: null };
}
