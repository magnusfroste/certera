// Submits one diploma's verification message to Hedera Consensus Service.
// Shared by hedera-sign (studio) and api (public API) so both write the same
// message and seal.
import { hederaConfig, parsePrivateKey } from "./hedera.ts";

export interface HederaSeal {
  hederaTxId: string;
  hederaTopicId: string;
  hederaSequenceNumber: string;
  hederaExplorerUrl: string;
  hederaTxExplorerUrl: string;
}

export const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export async function submitDiplomaToHedera(input: {
  diplomaId: string;
  contentHash: string;
  recipientName: string;
  institutionName: string;
  issuerDomain: string | null;
}): Promise<HederaSeal> {
  const hedera = hederaConfig();
  if (!hedera.accountId || !hedera.privateKey) throw new Error('Hedera credentials not configured');

  const hcsMessage = {
    type: 'DIPLOMA_VERIFICATION',
    version: '1.0',
    diplomaId: input.diplomaId,
    contentHash: input.contentHash,
    recipientNameHash: await sha256Hex(input.recipientName), // Privacy: hash the name
    institutionName: input.institutionName,
    issuerDomain: input.issuerDomain,
    timestamp: new Date().toISOString(),
    issuerAccount: hedera.accountId,
  };
  const messageBytes = new TextEncoder().encode(JSON.stringify(hcsMessage));

  const { Client, TopicMessageSubmitTransaction, TopicCreateTransaction, TopicId, PrivateKey } =
    await import("npm:@hashgraph/sdk@2.51.0");
  const client = hedera.network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
  try {
    client.setOperator(hedera.accountId, parsePrivateKey(PrivateKey, hedera.privateKey));

    let topicId = hedera.topicId;
    if (!topicId) {
      const topicTx = await new TopicCreateTransaction()
        .setTopicMemo('certera.ink - Diploma Verification')
        .execute(client);
      topicId = (await topicTx.getReceipt(client)).topicId!.toString() as string;
      console.log('Created HCS topic:', topicId);
    }

    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(messageBytes)
      .execute(client);
    const receipt = await submitTx.getReceipt(client);
    const sequenceNumber = receipt.topicSequenceNumber?.toString() || '0';
    const txId = submitTx.transactionId?.toString() || '';

    return {
      hederaTxId: txId,
      hederaTopicId: topicId,
      hederaSequenceNumber: sequenceNumber,
      hederaExplorerUrl: `${hedera.explorerBase}/topic/${topicId}`,
      hederaTxExplorerUrl: `${hedera.explorerBase}/transaction/${txId}`,
    };
  } finally {
    client.close();
  }
}
