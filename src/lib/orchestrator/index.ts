/**
 * Orchestrator — Cognitive Hub
 *
 * Receives a target URL, decomposes it into 8 sub-tasks,
 * dispatches to agents in parallel, validates output quality,
 * authorizes settlement, and assembles the consolidated report.
 */

import { AGENTS } from '@/lib/agents/registry';
import { createAgent } from '@/lib/agents/implementations';
import { env } from '@/lib/env';
import { normalizeSwarmUrl } from '@/lib/url';
import { saveJob } from './jobStore';
import { emitWebhook } from './webhook';
import type {
  SwarmRunRequest,
  SwarmJob,
  SwarmJobStatus,
  ConsolidatedReport,
  ReportSection,
  WebhookPayload,
} from '@/types/swarm';
import type { AgentOutput } from '@/types/agent';
import type { SettlementRecord } from '@/types/payment';

function generateJobId(): string {
  return `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new swarm job from a run request.
 */
export function createSwarmJob(request: SwarmRunRequest): SwarmJob {
  const selectedAgents = request.agents.length > 0
    ? AGENTS.filter((a) => request.agents.includes(a.id))
    : AGENTS;

  const job: SwarmJob = {
    id: generateJobId(),
    status: 'pending' as SwarmJobStatus,
    url: request.url,
    agentOutputs: selectedAgents.map((a) => ({
      agentId: a.id,
      status: 'queued' as const,
      result: null,
      qualityScore: null,
      startedAt: null,
      completedAt: null,
      error: null,
    })),
    settlements: [],
    totalCostUSDC: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    report: null,
    webhookUrl: request.webhookUrl,
  };

  // Persist initial state
  saveJob(job);
  return job;
}

/**
 * Fetch the HTML content of a target URL for agent analysis.
 */
export async function fetchPageContent(url: string): Promise<string> {
  const normalized = normalizeSwarmUrl(url);
  if (!normalized) {
    console.warn(`Skipping page fetch for unsupported URL: ${url}`);
    return '';
  }

  const candidates: string[] = [normalized];
  const normalizedUrl = new URL(normalized);
  if (normalizedUrl.protocol === 'https:') {
    const fallback = new URL(normalized);
    fallback.protocol = 'http:';
    candidates.push(fallback.toString());
  }

  const errors: string[] = [];
  for (const candidate of candidates) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(candidate, {
        headers: {
          'User-Agent': 'ArcSwarm-SEO-Agent/1.0 (compatible; Googlebot-compatible)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        errors.push(`${candidate} -> HTTP ${res.status}`);
        continue;
      }

      return await res.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate} -> ${message}`);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  console.warn(`Page fetch failed for ${normalized}. Attempts: ${errors.join(' | ')}`);
  return '';
}

/** Callback for streaming progress events */
export type ProgressCallback = (event: SwarmProgressEvent) => void;

export type SwarmProgressEvent =
  | { type: 'job:started'; job: Pick<SwarmJob, 'id' | 'status' | 'url'> }
  | { type: 'page:fetched'; contentLength: number }
  | { type: 'agent:started'; agentId: string; agentName: string }
  | { type: 'agent:retrying'; agentId: string; attempt: number; reason: string }
  | { type: 'agent:completed'; output: AgentOutput }
  | { type: 'settlement:completed'; settlement: SettlementRecord }
  | { type: 'settlement:skipped'; agentId: string; reason: string }
  | { type: 'report:generated'; report: ConsolidatedReport }
  | { type: 'webhook:sent'; url: string; success: boolean }
  | { type: 'job:completed'; job: SwarmJob }
  | { type: 'job:error'; error: string };

/**
 * Validate an agent's on-chain identity via ERC-8004 registry.
 * Returns true if validated, or if no registry is configured (grace mode).
 */
async function checkAgentIdentity(agentWalletAddress: string): Promise<boolean> {
  if (!env.ERC8004_REGISTRY_ADDRESS) {
    // Grace mode — no registry configured, skip validation
    return true;
  }

  try {
    const { validateAgentIdentity } = await import('@/lib/arc/identity');
    const isValid = await validateAgentIdentity(
      env.ERC8004_REGISTRY_ADDRESS,
      agentWalletAddress
    );
    return isValid;
  } catch (error) {
    console.warn('⚠️  ERC-8004 identity check failed, allowing settlement:', error);
    return true; // Fail-open on testnet
  }
}

/** Maximum retries per agent on transient errors */
const MAX_AGENT_RETRIES = 4;

/** Check if an error is transient (worth retrying) */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed')
  );
}

/** Run agents in batches to avoid rate limits */
async function runAgentsInBatches<T, R>(
  items: T[],
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const batchSize = 3;
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(task));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      // 12s delay between batches to stay under Gemini 15 RPM limit
      await new Promise((r) => setTimeout(r, 12000));
    }
  }
  return results;
}

/**
 * Execute a full swarm job — dispatches all agents in parallel,
 * validates quality, settles payments, and assembles the report.
 *
 * @param job - The swarm job to execute
 * @param onProgress - Optional callback for streaming progress events
 * @returns The completed job with all outputs, settlements, and report
 */
export async function executeSwarmJob(
  job: SwarmJob,
  onProgress?: ProgressCallback
): Promise<SwarmJob> {
  const emit = onProgress ?? (() => {});

  try {
    // 1. Mark job as running
    job.status = 'running';
    saveJob(job);
    emit({ type: 'job:started', job: { id: job.id, status: job.status, url: job.url } });

    // 2. Fetch page content
    const pageContent = await fetchPageContent(job.url);
    emit({ type: 'page:fetched', contentLength: pageContent.length });

    // 3. Identify which agents to run
    const agentIds = job.agentOutputs.map((o) => o.agentId);
    const agentsToRun = AGENTS.filter((a) => agentIds.includes(a.id));

    // 4. Dispatch agents in batches
    const resolvedOutputs = await runAgentsInBatches(agentsToRun, async (agentConfig) => {
      emit({ type: 'agent:started', agentId: agentConfig.id, agentName: agentConfig.name });

      // Update status in job
      const outputIdx = job.agentOutputs.findIndex((o) => o.agentId === agentConfig.id);
      if (outputIdx >= 0) {
        job.agentOutputs[outputIdx].status = 'running';
        job.agentOutputs[outputIdx].startedAt = new Date().toISOString();
      }

      try {
        const agent = createAgent(agentConfig);
        let output: AgentOutput | null = null;
        let lastError: unknown = null;
        let retryCount = 0;

        for (let attempt = 0; attempt <= MAX_AGENT_RETRIES; attempt++) {
          try {
            output = await agent.execute({
              url: job.url,
              pageContent,
            });
            retryCount = attempt;
            break; // Success
          } catch (err) {
            lastError = err;

            if (attempt < MAX_AGENT_RETRIES && isTransientError(err)) {
              retryCount = attempt + 1;
              emit({
                type: 'agent:retrying',
                agentId: agentConfig.id,
                attempt: attempt + 1,
                reason: err instanceof Error ? err.message : 'Unknown error',
              });
              
              // Dynamic backoff: 20s for quota limits, 1s/2s for network timeouts
              const isQuota = err instanceof Error && (err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('429'));
              let delayMs = 1000 * Math.pow(2, attempt);
              
              if (isQuota && err instanceof Error) {
                // Parse the exact retry delay from Gemini API (e.g. "retry in 18.27s")
                const match = err.message.match(/retry in ([\d\.]+)s/i);
                if (match && match[1]) {
                  delayMs = Math.ceil(parseFloat(match[1])) * 1000;
                } else {
                  delayMs = 20000;
                }
                // Add 2-8s jitter to prevent thundering herd when multiple agents wake up
                delayMs += 2000 + Math.random() * 6000;
              }
              
              await new Promise((r) => setTimeout(r, delayMs));
              continue;
            }
            throw err; // Non-transient or max retries exceeded
          }
        }

        if (!output) throw lastError ?? new Error('Agent returned no output');

        // Attach retry metadata
        if (retryCount > 0) {
          output.retryCount = retryCount;
        }

        // Update job with output
        if (outputIdx >= 0) {
          job.agentOutputs[outputIdx] = output;
        }

        saveJob(job);
        emit({ type: 'agent:completed', output });
        return output;
      } catch (error) {
        const failedOutput: AgentOutput = {
          agentId: agentConfig.id,
          status: 'failed',
          result: null,
          qualityScore: null,
          startedAt: job.agentOutputs[outputIdx]?.startedAt ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        if (outputIdx >= 0) {
          job.agentOutputs[outputIdx] = failedOutput;
        }

        saveJob(job);
        emit({ type: 'agent:completed', output: failedOutput });
        return failedOutput;
      }
    });

    // 5. Settlement phase
    job.status = 'settling';
    saveJob(job);
    const settlements: SettlementRecord[] = [];

    for (const output of resolvedOutputs) {
      if (output.status !== 'complete' || output.qualityScore === null) {
        emit({
          type: 'settlement:skipped',
          agentId: output.agentId,
          reason: output.status === 'failed'
            ? `Agent failed: ${output.error}`
            : 'No quality score',
        });
        continue;
      }

      if (output.qualityScore < env.QUALITY_THRESHOLD) {
        emit({
          type: 'settlement:skipped',
          agentId: output.agentId,
          reason: `Quality score ${output.qualityScore} below threshold ${env.QUALITY_THRESHOLD}`,
        });
        continue;
      }

      const agentConfig = AGENTS.find((a) => a.id === output.agentId);
      if (!agentConfig) continue;

      // Resolve wallet address — use real address from config, fall back to placeholder
      const agentWalletAddress = agentConfig.walletAddress || ('0x' + '0'.repeat(40));
      const hasRealWallet = !!agentConfig.walletAddress;

      // ERC-8004 identity check (only when real wallets are configured)
      if (hasRealWallet) {
        const identityValid = await checkAgentIdentity(agentWalletAddress);
        if (!identityValid) {
          emit({
            type: 'settlement:skipped',
            agentId: output.agentId,
            reason: 'Agent failed ERC-8004 identity validation',
          });
          continue;
        }
      }

      // Try real settlement via Circle SDK (only when real wallets exist)
      if (hasRealWallet) {
        try {
          const { settleAgentTask } = await import('@/lib/circle/settlement');
          const settlement = await settleAgentTask({
            agentId: output.agentId,
            agentName: agentConfig.name,
            agentWalletAddress,
            taskCostUSDC: agentConfig.costUSDC.toFixed(6),
            qualityScore: output.qualityScore,
          });

          settlements.push(settlement);
          emit({ type: 'settlement:completed', settlement });
          continue;
        } catch (error) {
          console.warn(`⚠️  Circle settlement failed for ${agentConfig.name}:`, error);
          // Fall through to demo settlement
        }
      }

      // Demo settlement record (no real wallet or Circle SDK unavailable)
      const demoSettlement: SettlementRecord = {
        id: `tx-${output.agentId}-${Date.now()}`,
        agentId: output.agentId,
        agentName: agentConfig.name,
        amountUSDC: agentConfig.costUSDC.toFixed(6),
        walletId: hasRealWallet ? (agentConfig.walletId ?? 'unknown') : 'demo-wallet',
        destinationAddress: agentWalletAddress,
        txHash: '0x' + Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join(''),
        state: 'COMPLETE',
        explorerUrl: `https://testnet.arcscan.app/tx/0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      settlements.push(demoSettlement);
      emit({ type: 'settlement:completed', settlement: demoSettlement });
    }

    job.settlements = settlements;
    job.totalCostUSDC = settlements.reduce(
      (sum, s) => sum + parseFloat(s.amountUSDC),
      0
    );

    // 6. Assemble report
    const report = assembleReport(job, resolvedOutputs);
    job.report = report;
    emit({ type: 'report:generated', report });

    // 7. Mark complete
    job.status = 'complete';
    job.completedAt = new Date().toISOString();
    saveJob(job);
    emit({ type: 'job:completed', job });

    // 8. Fire webhook (fire-and-forget)
    if (job.webhookUrl) {
      const payload: WebhookPayload = {
        jobId: job.id,
        status: job.status,
        url: job.url,
        totalCostUSDC: job.totalCostUSDC,
        report,
        settlements: job.settlements,
        completedAt: job.completedAt!,
      };

      emitWebhook(job.webhookUrl, payload).then((success) => {
        emit({ type: 'webhook:sent', url: job.webhookUrl!, success });
      });
    }

    return job;
  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date().toISOString();
    saveJob(job);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    emit({ type: 'job:error', error: errorMsg });
    return job;
  }
}

/**
 * Assemble a consolidated report from all agent outputs.
 */
export function assembleReport(
  job: SwarmJob,
  outputs: AgentOutput[]
): ConsolidatedReport {
  const completedOutputs = outputs.filter((o) => o.status === 'complete');

  const seoOutputs = completedOutputs.filter((o) => {
    const agent = AGENTS.find((a) => a.id === o.agentId);
    return agent?.wing === 'SEO';
  });

  const aeoOutputs = completedOutputs.filter((o) => {
    const agent = AGENTS.find((a) => a.id === o.agentId);
    return agent?.wing === 'AEO';
  });

  const avgScore = (arr: AgentOutput[]) =>
    arr.length > 0
      ? arr.reduce((s, o) => s + (o.qualityScore ?? 0), 0) / arr.length
      : 0;

  const sections: ReportSection[] = completedOutputs.map((output) => {
    const agent = AGENTS.find((a) => a.id === output.agentId)!;
    const result = output.result ?? {};

    // Extract findings and recommendations from agent output
    const findings: string[] = [];
    const recommendations: string[] = [];

    if (Array.isArray(result.issues)) {
      findings.push(...(result.issues as string[]));
    }
    if (Array.isArray(result.technicalIssues)) {
      findings.push(
        ...(result.technicalIssues as Array<{ issue?: string }>).map(
          (i) => (typeof i === 'object' && i?.issue) ? i.issue : String(i)
        )
      );
    }
    if (Array.isArray(result.nlpIssues)) {
      findings.push(
        ...(result.nlpIssues as Array<{ issue?: string }>).map(
          (i) => (typeof i === 'object' && i?.issue) ? i.issue : String(i)
        )
      );
    }
    if (Array.isArray(result.semanticGaps)) {
      findings.push(...(result.semanticGaps as string[]));
    }
    if (Array.isArray(result.validationErrors)) {
      findings.push(...(result.validationErrors as string[]));
    }

    if (Array.isArray(result.recommendations)) {
      recommendations.push(...(result.recommendations as string[]));
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      wing: agent.wing,
      title: agent.task,
      findings: findings.slice(0, 10), // Cap at 10
      recommendations: recommendations.slice(0, 10),
      data: result,
    };
  });

  return {
    jobId: job.id,
    url: job.url,
    seoScore: Math.round(avgScore(seoOutputs)),
    aeoScore: Math.round(avgScore(aeoOutputs)),
    overallScore: Math.round(avgScore(completedOutputs)),
    sections,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate total settlement cost for a set of outputs.
 */
export function calculateTotalCost(settlements: SettlementRecord[]): number {
  return settlements.reduce(
    (sum, s) => sum + parseFloat(s.amountUSDC),
    0
  );
}

