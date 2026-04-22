/**
 * Arc L1 Ethers.js Provider
 *
 * JSON-RPC provider for Arc Testnet.
 * Used for on-chain reads, contract calls, and tx verification.
 */

import { ARC_CONFIG } from './config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _provider: any = null;

/**
 * Get or create an ethers.js JsonRpcProvider for Arc Testnet.
 *
 * Returns null if ethers.js is not installed or RPC is misconfigured.
 */
export async function getArcProvider() {
  if (_provider) return _provider;

  if (!ARC_CONFIG.rpcUrl) {
    console.warn('⚠️  ARC_TESTNET_RPC not configured');
    return null;
  }

  try {
    const { ethers } = await import('ethers');
    _provider = new ethers.JsonRpcProvider(ARC_CONFIG.rpcUrl, {
      name: ARC_CONFIG.networkName,
      chainId: ARC_CONFIG.chainId,
    });

    // Quick health check
    const blockNumber = await _provider.getBlockNumber();
    console.log(`✅ Arc Testnet connected — block #${blockNumber}`);

    return _provider;
  } catch (error) {
    console.error('❌ Failed to connect to Arc Testnet:', error);
    return null;
  }
}
