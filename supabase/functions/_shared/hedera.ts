// Hedera network selection for signing and health checks.
// HEDERA_NETWORK=mainnet switches to mainnet and uses HEDERA_MAINNET_ACCOUNT_ID /
// HEDERA_MAINNET_PRIVATE_KEY / HEDERA_MAINNET_TOPIC_ID. Anything else (default)
// uses testnet with HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY / HEDERA_TOPIC_ID.
// Already-signed diplomas keep their own network: verification picks the mirror
// node from the stored hashscan URL.
export type HederaNetwork = "mainnet" | "testnet";

export function hederaConfig() {
  const network: HederaNetwork = Deno.env.get("HEDERA_NETWORK") === "mainnet" ? "mainnet" : "testnet";
  const env = (name: string) =>
    Deno.env.get(network === "mainnet" ? `HEDERA_MAINNET_${name}` : `HEDERA_${name}`) || undefined;
  return {
    network,
    accountId: env("ACCOUNT_ID"),
    privateKey: env("PRIVATE_KEY"),
    topicId: env("TOPIC_ID"),
    explorerBase: `https://hashscan.io/${network}`,
  };
}

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePrivateKey(PrivateKey: any, raw: string) {
  try { return PrivateKey.fromStringDer(raw); } catch { /* try next format */ }
  try { return PrivateKey.fromStringED25519(raw); } catch { /* try next format */ }
  try { return PrivateKey.fromStringECDSA(raw); } catch { /* fall through */ }
  throw new Error("Could not parse private key. Ensure it is a valid HEX or DER-encoded Hedera private key.");
}
