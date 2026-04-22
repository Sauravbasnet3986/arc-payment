/**
 * Arc L1 Network Configuration
 *
 * Centralized config for Arc testnet — chain ID, RPC, USDC address,
 * and explorer URL construction.
 */

import { env } from '@/lib/env';

export const ARC_CONFIG = {
  /** Chain ID for Arc Testnet */
  chainId: env.ARC_TESTNET_CHAIN_ID,

  /** JSON-RPC endpoint */
  rpcUrl: env.ARC_TESTNET_RPC,

  /** USDC token contract address */
  usdcAddress: env.ARC_TESTNET_USDC,

  /** Block explorer base URL */
  explorerUrl: 'https://testnet.arcscan.app',

  /** Network name for display */
  networkName: 'Arc Testnet',

  /** Gas token (USDC, not ETH) */
  gasToken: 'USDC',

  /** Consensus mechanism */
  consensus: 'Malachite (Tendermint BFT)',

  /** Finality time */
  finality: '< 1 second',
} as const;

/**
 * Build ArcScan explorer URL for a transaction hash.
 */
export function getTxExplorerUrl(txHash: string): string {
  return `${ARC_CONFIG.explorerUrl}/tx/${txHash}`;
}

/**
 * Build ArcScan explorer URL for a wallet address.
 */
export function getAddressExplorerUrl(address: string): string {
  return `${ARC_CONFIG.explorerUrl}/address/${address}`;
}
