/**
 * Circle Nanopayments — EIP-3009 Off-Chain Signing
 *
 * Zero-gas payment signatures for the x402 HTTP payment protocol.
 * Signatures are batched and settled on Arc L1 by Circle Gateway.
 */

import { env } from '@/lib/env';
import type { NanopaymentSignature } from '@/types/payment';

/**
 * Domain separator for EIP-712 typed data (USDC on Arc Testnet).
 */
export function getEIP3009Domain() {
  return {
    name: 'USD Coin',
    version: '2',
    chainId: env.ARC_TESTNET_CHAIN_ID,
    verifyingContract: env.ARC_TESTNET_USDC,
  };
}

/**
 * EIP-3009 TransferWithAuthorization type definition.
 */
export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

/**
 * Sign an EIP-3009 TransferWithAuthorization message.
 *
 * This is a zero-gas, fully off-chain operation.
 * The signed authorization is submitted to Circle's Nanopayments
 * API and settled in a batched on-chain transaction later.
 *
 * @param signer - ethers.js Wallet with private key
 * @param amount - USDC amount (human-readable, e.g. "0.008")
 * @param recipient - destination address
 * @returns Signed nanopayment authorization
 *
 * Usage:
 * ```ts
 * import { ethers } from 'ethers';
 * const wallet = new ethers.Wallet(privateKey, provider);
 * const sig = await signNanopayment(wallet, "0.008", recipientAddr);
 * ```
 */
export async function signNanopayment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any,
  amount: string,
  recipient: string
): Promise<NanopaymentSignature> {
  // Dynamic import — ethers may not be installed yet
  const { ethers } = await import('ethers');

  const value = ethers.parseUnits(amount, 6); // USDC = 6 decimals
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

  const domain = getEIP3009Domain();
  const message = {
    from: await signer.getAddress(),
    to: recipient,
    value,
    validAfter: 0,
    validBefore,
    nonce,
  };

  const signature = await signer.signTypedData(domain, EIP3009_TYPES, message);

  return {
    from: message.from,
    to: recipient,
    value: value.toString(),
    validAfter: 0,
    validBefore,
    nonce,
    signature,
  };
}
