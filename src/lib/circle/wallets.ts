/**
 * Circle Wallet Management Utilities
 *
 * Create, fund, and query agent wallets on Arc Testnet.
 */

import { getCircleClient, CIRCLE_CONSTANTS } from './client';
import type { Blockchain } from '@circle-fin/developer-controlled-wallets';

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

export interface AgentWalletInfo {
  agentSlug: string;
  walletId: string;
  address: string;
  blockchain: string;
}

export interface WalletSetupResult {
  walletSetId: string;
  wallets: AgentWalletInfo[];
}

/**
 * Create a wallet set + one wallet per agent on Arc Testnet.
 *
 * Call once during initial setup. Wallet IDs are returned
 * and should be stored/mapped to agent configs.
 */
export async function createAgentWallets(): Promise<WalletSetupResult> {
  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  // 1. Create wallet set to group all agents
  const walletSetRes = await client.createWalletSet({
    name: 'SEO-AEO-Swarm-Agents',
  });

  const walletSetId = walletSetRes.data?.walletSet?.id ?? '';

  if (!walletSetId) {
    throw new Error('Failed to create wallet set — no ID returned');
  }

  // 2. Create one wallet per agent
  const wallets: AgentWalletInfo[] = [];

  for (const slug of AGENT_SLUGS) {
    const walletRes = await client.createWallets({
      blockchains: [CIRCLE_CONSTANTS.BLOCKCHAIN as Blockchain],
      count: 1,
      walletSetId,
      metadata: [{ name: slug, refId: slug }],
    });

    const wallet = walletRes.data?.wallets?.[0];
    if (wallet) {
      wallets.push({
        agentSlug: slug,
        walletId: wallet.id ?? '',
        address: wallet.address ?? '',
        blockchain: wallet.blockchain ?? CIRCLE_CONSTANTS.BLOCKCHAIN,
      });
    }
  }

  return { walletSetId, wallets };
}

/**
 * Check the USDC balance of a wallet.
 */
export async function getWalletBalance(walletId: string) {
  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  const res = await client.getWalletTokenBalance({ id: walletId });
  return res.data?.tokenBalances ?? [];
}

/**
 * List outbound transactions for given wallet(s).
 */
export async function listWalletTransactions(walletIds: string[]) {
  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  const res = await client.listTransactions({
    walletIds,
    txType: 'OUTBOUND',
  });
  return res.data?.transactions ?? [];
}
