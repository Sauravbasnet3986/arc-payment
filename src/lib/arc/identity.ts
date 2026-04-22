/**
 * ERC-8004 Agent Identity Contracts
 *
 * On-chain agent identity and reputation on Arc L1.
 * Each agent has a corresponding identity contract that records
 * task history, quality scores, and proof-of-work hashes.
 *
 * Status: Verify contract addresses at
 * https://docs.arc.network/arc/references/contract-addresses
 */

import { getArcProvider } from './provider';

/**
 * ERC-8004 Registry ABI (minimal interface).
 * Full ABI should be fetched from Arc docs when integrating.
 */
const ERC8004_ABI = [
  'function registerAgent(address wallet, string memory metadata) external returns (uint256)',
  'function recordTask(address agent, bytes32 proofHash, uint8 qualityScore) external',
  'function getAgentProfile(address agent) external view returns (string memory, uint256, uint256)',
  'function isRegistered(address agent) external view returns (bool)',
] as const;

/**
 * Validate that an agent is registered in the ERC-8004 registry.
 *
 * The orchestrator calls this before every settlement to verify authenticity.
 */
export async function validateAgentIdentity(
  registryAddress: string,
  agentAddress: string
): Promise<boolean> {
  const provider = await getArcProvider();
  if (!provider) {
    console.warn('⚠️  Cannot validate agent identity — Arc provider not available');
    return false;
  }

  try {
    const { ethers } = await import('ethers');
    const registry = new ethers.Contract(registryAddress, ERC8004_ABI, provider);
    return await registry.isRegistered(agentAddress);
  } catch (error) {
    console.error('❌ Agent identity validation failed:', error);
    return false;
  }
}

/**
 * Record a completed task's proof-of-work on-chain.
 *
 * Appends proof hash + quality score to the agent's
 * immutable reputation log on Arc L1.
 */
export async function recordTaskProof(params: {
  registryAddress: string;
  agentAddress: string;
  proofHash: string;
  qualityScore: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any;
}): Promise<string | null> {
  try {
    const { ethers } = await import('ethers');
    const registry = new ethers.Contract(
      params.registryAddress,
      ERC8004_ABI,
      params.signer
    );
    const tx = await registry.recordTask(
      params.agentAddress,
      params.proofHash,
      params.qualityScore
    );
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error('❌ Failed to record task proof:', error);
    return null;
  }
}
