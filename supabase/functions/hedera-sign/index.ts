import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Hedera Testnet REST API
const HEDERA_TESTNET_API = 'https://testnet.mirrornode.hedera.com/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEDERA_ACCOUNT_ID = Deno.env.get('HEDERA_ACCOUNT_ID');
    const HEDERA_PRIVATE_KEY = Deno.env.get('HEDERA_PRIVATE_KEY');

    if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
      throw new Error('Hedera credentials not configured');
    }

    const { contentHash, recipientName, institutionName, diplomaId } = await req.json();

    if (!contentHash || !recipientName || !institutionName || !diplomaId) {
      throw new Error('Missing required fields: contentHash, recipientName, institutionName, diplomaId');
    }

    // Build the HCS message payload
    const hcsMessage = {
      type: 'DIPLOMA_VERIFICATION',
      version: '1.0',
      diplomaId,
      contentHash,
      recipientNameHash: await sha256(recipientName), // Privacy: hash the name
      institutionName,
      timestamp: new Date().toISOString(),
      issuerAccount: HEDERA_ACCOUNT_ID,
    };

    const messageBytes = new TextEncoder().encode(JSON.stringify(hcsMessage));

    // Use Hedera SDK to submit HCS message
    // Dynamic import to handle the SDK
    const { Client, TopicMessageSubmitTransaction, TopicCreateTransaction, TopicId, PrivateKey } = 
      await import("npm:@hashgraph/sdk@2.51.0");

    const client = Client.forTestnet();
    
    // Try parsing the private key in multiple formats
    let privateKey;
    try {
      privateKey = PrivateKey.fromStringDer(HEDERA_PRIVATE_KEY);
    } catch {
      try {
        privateKey = PrivateKey.fromStringED25519(HEDERA_PRIVATE_KEY);
      } catch {
        try {
          privateKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);
        } catch {
          throw new Error('Could not parse private key. Ensure it is a valid HEX or DER-encoded Hedera private key.');
        }
      }
    }
    
    client.setOperator(HEDERA_ACCOUNT_ID, privateKey);

    // Use a shared topic - stored as env var or create one
    let topicId: string;
    const HEDERA_TOPIC_ID = Deno.env.get('HEDERA_TOPIC_ID');
    
    if (HEDERA_TOPIC_ID) {
      topicId = HEDERA_TOPIC_ID;
    } else {
      // Create a new topic for diploma verification
      console.log('Creating new HCS topic...');
      const topicTx = await new TopicCreateTransaction()
        .setTopicMemo('certera.ink - Diploma Verification')
        .execute(client);
      const topicReceipt = await topicTx.getReceipt(client);
      topicId = topicReceipt.topicId!.toString();
      console.log('Created HCS topic:', topicId);
      // Note: Save this topic ID as a secret for future use
    }

    // Submit message to HCS
    console.log('Submitting message to HCS topic:', topicId);
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(messageBytes)
      .execute(client);

    const submitReceipt = await submitTx.getReceipt(client);
    const sequenceNumber = submitReceipt.topicSequenceNumber?.toString() || '0';
    const txId = submitTx.transactionId?.toString() || '';

    console.log('HCS message submitted successfully');
    console.log('Transaction ID:', txId);
    console.log('Sequence Number:', sequenceNumber);

    client.close();

    return new Response(JSON.stringify({
      success: true,
      transactionId: txId,
      topicId,
      sequenceNumber,
      consensusTimestamp: new Date().toISOString(),
      explorerUrl: `https://hashscan.io/testnet/topic/${topicId}`,
      txExplorerUrl: `https://hashscan.io/testnet/transaction/${txId}`,
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

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
