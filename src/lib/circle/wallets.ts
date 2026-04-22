/**
 * Circle Wallet Management Utilities
 *
 * Create, fund, and query agent wallets on Arc Testnet.
 */

import { getCircleClient, CIRCLE_CONSTANTS } from './client';

const AGENT_SLUGS = [
  'metadata-architect',
  'keyword-specialist',
  'tech-health-monitor',
  'link-strategist',
  'schema-engineer',
  'snippet-transformer',
  'conversational-auditor',
  'alttext-agent',
] as const;

/**
 * Create a wallet set + one wallet per agent on Arc Testnet.
 *
 * Call once during initial setup. Wallet IDs are returned
 * and should be stored/mapped to agent configs.
 */
export async function createAgentWallets() {
  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  // 1. Create wallet set to group all agents
  const walletSetRes = await client.createWalletSet({
    name: 'SEO-AEO-Swarm-Agents',
  });

  const walletSetId = (walletSetRes as { data: { walletSet: { id: string } } })
    .data.walletSet.id;

  // 2. Create one wallet per agent
  const wallets = await Promise.all(
    AGENT_SLUGS.map((slug) =>
      client.createWallets({
        blockchains: [CIRCLE_CONSTANTS.BLOCKCHAIN],
        count: 1,
        walletSetId,
        metadata: [{ name: slug, refId: slug }],
      })
    )
  );

  return {
    walletSetId,
    wallets: wallets.map((w, i) => ({
      agentSlug: AGENT_SLUGS[i],
      wallet: w,
    })),
  };
}

/**
 * Check the USDC balance of a wallet.
 */
export async function getWalletBalance(walletId: string) {
  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  return client.getWalletTokenBalance({ id: walletId });
}

/**
 * List outbound transactions for given wallet(s).
 */
export async function listWalletTransactions(walletIds: string[]) {
  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  return client.listTransactions({
    walletIds,
    txType: 'OUTBOUND',
  });
}
