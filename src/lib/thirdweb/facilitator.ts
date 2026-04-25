/**
 * Thirdweb x402 Facilitator
 *
 * Verifies and submits x402 payments (nanopayments) gaslessly
 * using EIP-7702 and your server wallet.
 */

import { env } from '@/lib/env';

// Dynamic imports to allow graceful degradation if 'thirdweb' is not installed
async function getThirdwebModules() {
  try {
    const { createThirdwebClient } = await import('thirdweb');
    const { facilitator } = await import('thirdweb/x402');
    return { createThirdwebClient, facilitator };
  } catch (error) {
    console.warn('⚠️  thirdweb package not found or failed to load:', error);
    return null;
  }
}

/**
 * Initialize and return the Thirdweb Facilitator instance.
 */
export async function getThirdwebFacilitator() {
  if (!env.THIRDWEB_SECRET_KEY || !env.FACILITATOR_SERVER_WALLET) {
    return null;
  }

  const modules = await getThirdwebModules();
  if (!modules) return null;

  const { createThirdwebClient, facilitator } = modules;

  const client = createThirdwebClient({
    secretKey: env.THIRDWEB_SECRET_KEY,
  });

  return facilitator({
    client,
    serverWalletAddress: env.FACILITATOR_SERVER_WALLET,
    waitUntil: 'confirmed',
  });
}

/**
 * Settle a payment via Thirdweb Facilitator.
 */
export async function settleThirdwebPayment(params: {
  paymentData: string;
  payTo: string;
  amount: string;
  network?: any;
}) {
  const { paymentData, payTo, amount, network } = params;
  
  const modules = await getThirdwebModules();
  if (!modules) throw new Error('Thirdweb modules not available');
  
  const { settlePayment } = await import('thirdweb/x402');
  const facilitatorInstance = await getThirdwebFacilitator();
  
  if (!facilitatorInstance) {
    throw new Error('Thirdweb Facilitator not configured (missing secret key or server wallet)');
  }

  return await settlePayment({
    paymentData,
    payTo,
    price: `$${amount}`,
    network,
    facilitator: facilitatorInstance,
  });
}
