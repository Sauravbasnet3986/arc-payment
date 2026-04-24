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

  // Resolve the tokenId for Arc testnet USDC from the orchestrator wallet balance.
  // Circle transfer API is most reliable with tokenId for this flow.
  const balanceRes = await client.getWalletTokenBalance({
    id: env.ORCHESTRATOR_WALLET_ID,
  });
  const usdcToken = balanceRes.data?.tokenBalances?.find(
    (b) => b.token?.symbol === 'USDC' && b.token?.blockchain === CIRCLE_CONSTANTS.BLOCKCHAIN
  );
  const usdcTokenId = usdcToken?.token?.id;

  if (!usdcTokenId) {
    throw new Error(
      'Unable to resolve Arc testnet USDC tokenId from orchestrator wallet. Fund the orchestrator wallet with USDC first.'
    );
  }

  // Create the USDC transfer using the SDK's createTransaction method
  // SDK method signature: createTransaction(input: CreateTransferTransactionInput)
  const txRes = await client.createTransaction({
    amount: [taskCostUSDC],
    destinationAddress: agentWalletAddress,
    walletId: env.ORCHESTRATOR_WALLET_ID,
    tokenId: usdcTokenId,
    fee: CIRCLE_CONSTANTS.FEE_CONFIG,
  });

  const txId = txRes.data?.id ?? '';
  let state: string = txRes.data?.state ?? 'INITIATED';
  let txHash: string | null = null;

  // Poll until finality (Arc < 1s, but allow up to 30s)
  const TERMINAL = ['COMPLETE', 'FAILED', 'CANCELLED'];
  const MAX_POLLS = 30;

  for (let i = 0; i < MAX_POLLS && !TERMINAL.includes(state); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await client.getTransaction({ id: txId });
    state = poll.data?.transaction?.state ?? state;
    txHash = poll.data?.transaction?.txHash ?? txHash;
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
