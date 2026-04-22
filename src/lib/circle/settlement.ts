/**
 * Payment Settlement — Orchestrator → Agent USDC Transfers
 *
 * After an agent completes a task and passes quality validation,
 * the orchestrator releases payment via Circle SDK.
 */

import { env } from '@/lib/env';
import { getCircleClient, CIRCLE_CONSTANTS } from './client';
import type { SettlementRecord, TransactionState } from '@/types/payment';

/**
 * Settle payment for a completed agent task.
 *
 * 1. Validates output quality meets threshold
 * 2. Creates USDC transfer from orchestrator → agent wallet
 * 3. Polls until Arc finalizes (< 1 second)
 * 4. Returns settlement record with tx hash + explorer link
 */
export async function settleAgentTask(params: {
  agentId: string;
  agentName: string;
  agentWalletAddress: string;
  taskCostUSDC: string;
  qualityScore: number;
}): Promise<SettlementRecord> {
  const { agentId, agentName, agentWalletAddress, taskCostUSDC, qualityScore } =
    params;

  // Quality gate
  if (qualityScore < env.QUALITY_THRESHOLD) {
    return {
      id: '',
      agentId,
      agentName,
      amountUSDC: taskCostUSDC,
      walletId: '',
      destinationAddress: agentWalletAddress,
      txHash: null,
      state: 'FAILED' as TransactionState,
      explorerUrl: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
  }

  const client = await getCircleClient();
  if (!client) throw new Error('Circle SDK not available');

  // Create the USDC transfer
  const txRes = (await client.createTransaction({
    blockchain: CIRCLE_CONSTANTS.BLOCKCHAIN,
    walletId: env.ORCHESTRATOR_WALLET_ID,
    destinationAddress: agentWalletAddress,
    amount: [taskCostUSDC],
    tokenAddress: CIRCLE_CONSTANTS.USDC_TOKEN_ADDRESS,
    fee: CIRCLE_CONSTANTS.FEE_CONFIG,
  })) as { data: { id: string; state: string; txHash?: string } };

  const txId = txRes.data.id;

  // Poll until finality (Arc < 1s, but allow up to 30s)
  let state: string = txRes.data.state;
  let txHash: string | null = txRes.data.txHash ?? null;
  const TERMINAL = ['COMPLETE', 'FAILED', 'CANCELLED'];
  const MAX_POLLS = 30;

  for (let i = 0; i < MAX_POLLS && !TERMINAL.includes(state); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = (await client.getTransaction({ id: txId })) as {
      data: { transaction: { state: string; txHash?: string } };
    };
    state = poll.data.transaction.state;
    txHash = poll.data.transaction.txHash ?? txHash;
  }

  return {
    id: txId,
    agentId,
    agentName,
    amountUSDC: taskCostUSDC,
    walletId: env.ORCHESTRATOR_WALLET_ID,
    destinationAddress: agentWalletAddress,
    txHash,
    state: state as TransactionState,
    explorerUrl: txHash
      ? `https://testnet.arcscan.app/tx/${txHash}`
      : null,
    createdAt: new Date().toISOString(),
    completedAt: TERMINAL.includes(state) ? new Date().toISOString() : null,
  };
}
