/**
 * POST /api/v1/x402/settle
 *
 * x402 Settlement Endpoint using Thirdweb Facilitator.
 * Verifies the payment signature and submits it on-chain gaslessly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { settleThirdwebPayment } from '@/lib/thirdweb';

export async function POST(request: NextRequest) {
  try {
    const paymentData =
      request.headers.get('PAYMENT-SIGNATURE') ||
      request.headers.get('X-PAYMENT');

    if (!paymentData) {
      return NextResponse.json(
        { error: 'Missing payment signature header (PAYMENT-SIGNATURE or X-PAYMENT)' },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { payTo, amount, chainId } = body;

    if (!payTo || !amount) {
      return NextResponse.json(
        { error: 'Missing payTo or amount in request body' },
        { status: 400 }
      );
    }

    // Resolve network if chainId provided
    let network = undefined;
    if (chainId) {
      // In a real app, you'd map chainId to a thirdweb chain object
      // For this demo, we'll let the facilitator handle the default or pass the ID
      network = chainId;
    }

    const result = await settleThirdwebPayment({
      paymentData,
      payTo,
      amount,
      network,
    });

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      status: result.status,
    });
  } catch (error) {
    console.error('x402 Settlement Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown settlement error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/x402/settle
 *
 * Health check / info for the facilitator.
 */
export async function GET() {
  const { getThirdwebFacilitator } = await import('@/lib/thirdweb');
  const facilitator = await getThirdwebFacilitator();

  if (!facilitator) {
    return NextResponse.json(
      { status: 'not_configured', message: 'Thirdweb Facilitator is not configured' },
      { status: 503 }
    );
  }

  try {
    const supported = await facilitator.supported();
    return NextResponse.json({
      status: 'active',
      supportedMethods: supported,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
