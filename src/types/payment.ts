/**
 * Payment & settlement type definitions.
 */

export type TransactionState =
  | 'INITIATED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED';

export interface SettlementRecord {
  id: string;
  agentId: string;
  agentName: string;
  amountUSDC: string;
  walletId: string;
  destinationAddress: string;
  txHash: string | null;
  state: TransactionState;
  explorerUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface NanopaymentSignature {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string;
}

export interface WalletInfo {
  id: string;
  address: string;
  blockchain: string;
  balanceUSDC: string;
  agentId: string | null;
}
