import { supabase } from '@/integrations/supabase/client';

export interface DiplomaRecord {
  id: string;
  contentHash: string;
  signature: string;
  timestamp: number;
  recipientInfo: string;
  institutionInfo: string;
  diplomatorSeal: string;
  hederaTxId?: string;
  hederaTopicId?: string;
  hederaSequenceNumber?: string;
  hederaExplorerUrl?: string;
}

/**
 * Creates a SHA-256 hash using Web Crypto API
 */
export const createWebCryptoHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Creates a SHA-256 hash of the diploma content
 */
export const createContentHash = async (html: string, css: string): Promise<string> => {
  return await createWebCryptoHash(html + css);
};

/**
 * Creates certera.ink's cryptographic signature
 */
const DIPLOMATOR_PRIVATE_KEY = 'diplomator_secure_key_2024';

export const createDiplomatorSignature = async (contentHash: string, recipientName: string): Promise<string> => {
  const signatureData = `${contentHash}:${recipientName}:${DIPLOMATOR_PRIVATE_KEY}`;
  return await createWebCryptoHash(signatureData);
};

/**
 * Generates a unique diploma ID
 */
export const generateDiplomaId = (): string => {
  return 'DIP_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
};

const getCurrentBaseUrl = (): string => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://certera.ink';
};

/**
 * Signs a diploma to Hedera blockchain and stores in database
 */
export const signDiplomaToBlockchain = async (
  html: string,
  css: string,
  recipientName: string,
  institutionName: string
): Promise<DiplomaRecord> => {
  const contentHash = await createContentHash(html, css);
  const diplomaId = generateDiplomaId();
  const signature = await createDiplomatorSignature(contentHash, recipientName);
  const diplomatorSeal = await createWebCryptoHash(`DIPLOMATOR_SEAL_${diplomaId}`);

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User must be authenticated to sign diplomas');

  // Submit to Hedera via edge function
  let hederaResult: {
    transactionId: string;
    topicId: string;
    sequenceNumber: string;
    explorerUrl: string;
    txExplorerUrl: string;
  } | null = null;

  try {
    const { data, error } = await supabase.functions.invoke('hedera-sign', {
      body: { contentHash, recipientName, institutionName, diplomaId },
    });

    if (error) {
      console.error('Hedera edge function error:', error);
      throw new Error('Hedera signing failed: ' + error.message);
    }

    if (!data?.success) {
      throw new Error('Hedera signing failed: ' + (data?.error || 'Unknown error'));
    }

    hederaResult = data;
    console.log('Hedera signing successful:', hederaResult);
  } catch (err) {
    console.error('Hedera signing error:', err);
    throw err;
  }

  const verificationUrl = createVerificationUrl(diplomaId);
  const diplomaUrl = createDiplomaUrl(diplomaId);

  // Store the Hedera transaction info in diplomator_seal field as JSON
  const sealData = JSON.stringify({
    hederaTxId: hederaResult.transactionId,
    hederaTopicId: hederaResult.topicId,
    hederaSequenceNumber: hederaResult.sequenceNumber,
    hederaExplorerUrl: hederaResult.explorerUrl,
    hederaTxExplorerUrl: hederaResult.txExplorerUrl,
  });

  const { error: insertError } = await supabase
    .from('signed_diplomas')
    .insert({
      blockchain_id: diplomaId,
      issuer_id: user.id,
      recipient_name: recipientName,
      institution_name: institutionName,
      diploma_html: html,
      diploma_css: css,
      content_hash: contentHash,
      signature,
      diplomator_seal: sealData,
      verification_url: verificationUrl,
      diploma_url: diplomaUrl,
    });

  if (insertError) throw new Error('Failed to store diploma: ' + insertError.message);

  sessionStorage.setItem('lastDiplomaUrl', diplomaUrl);

  return {
    id: diplomaId,
    contentHash,
    signature,
    timestamp: Date.now(),
    recipientInfo: await createWebCryptoHash(recipientName),
    institutionInfo: institutionName,
    diplomatorSeal: sealData,
    hederaTxId: hederaResult.transactionId,
    hederaTopicId: hederaResult.topicId,
    hederaSequenceNumber: hederaResult.sequenceNumber,
    hederaExplorerUrl: hederaResult.explorerUrl,
  };
};

/**
 * Verifies a diploma against blockchain records
 */
export const verifyDiplomaFromBlockchain = async (
  diplomaId: string,
  html: string,
  css: string,
  recipientName: string
): Promise<{ isValid: boolean; record?: DiplomaRecord; issues: string[] }> => {
  const issues: string[] = [];

  const { data: diplomaData, error } = await supabase
    .from('signed_diplomas')
    .select('*')
    .eq('blockchain_id', diplomaId)
    .single();

  if (error || !diplomaData) {
    issues.push('Diploma not found on blockchain');
    return { isValid: false, issues };
  }

  // Verify content hash
  const currentContentHash = await createContentHash(html, css);
  if (currentContentHash !== diplomaData.content_hash) {
    issues.push('Diploma content has been tampered with');
  }

  // Verify signature
  const expectedSignature = await createDiplomatorSignature(diplomaData.content_hash, recipientName);
  if (expectedSignature !== diplomaData.signature) {
    issues.push('Invalid certera.ink signature');
  }

  // Verify recipient
  const recipientHash = await createWebCryptoHash(recipientName);
  const storedRecipientHash = await createWebCryptoHash(diplomaData.recipient_name);
  if (recipientHash !== storedRecipientHash) {
    issues.push('Recipient name does not match blockchain record');
  }

  // Parse Hedera data
  let hederaData: any = {};
  try {
    hederaData = JSON.parse(diplomaData.diplomator_seal);
  } catch { /* legacy record without hedera data */ }

  const record: DiplomaRecord = {
    id: diplomaData.blockchain_id,
    contentHash: diplomaData.content_hash,
    signature: diplomaData.signature,
    timestamp: new Date(diplomaData.created_at).getTime(),
    recipientInfo: diplomaData.recipient_name,
    institutionInfo: diplomaData.institution_name,
    diplomatorSeal: diplomaData.diplomator_seal,
    hederaTxId: hederaData.hederaTxId,
    hederaTopicId: hederaData.hederaTopicId,
    hederaSequenceNumber: hederaData.hederaSequenceNumber,
    hederaExplorerUrl: hederaData.hederaExplorerUrl,
  };

  return { isValid: issues.length === 0, record, issues };
};

export const getAllBlockchainRecords = async (): Promise<DiplomaRecord[]> => {
  const { data, error } = await supabase
    .from('signed_diplomas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];

  return data.map(d => ({
    id: d.blockchain_id,
    contentHash: d.content_hash,
    signature: d.signature,
    timestamp: new Date(d.created_at).getTime(),
    recipientInfo: d.recipient_name,
    institutionInfo: d.institution_name,
    diplomatorSeal: d.diplomator_seal,
  }));
};

export const createVerificationUrl = (diplomaId: string): string => {
  return `${getCurrentBaseUrl()}/verify/${diplomaId}`;
};

export const createDiplomaUrl = (diplomaId: string): string => {
  return `${getCurrentBaseUrl()}/diploma/${diplomaId}`;
};
