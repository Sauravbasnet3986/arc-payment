'use client';

import { useState, useCallback, useEffect } from 'react';
import SwarmRunner from '@/components/SwarmRunner';
import AgentStatusGrid from '@/components/AgentStatusGrid';
import TransactionLog from '@/components/TransactionLog';
import ConsolidatedReport from '@/components/ConsolidatedReport';
import { AGENTS, TOTAL_SWARM_COST } from '@/lib/agents/registry';
import type { AgentOutput } from '@/types/agent';
import type { SettlementRecord } from '@/types/payment';
import type { ConsolidatedReport as ReportType } from '@/types/swarm';

interface SSEEvent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RecentJob {
  id: string;
  status: string;
  url: string;
  agentCount: number;
  completedAgents: number;
  failedAgents: number;
  totalCostUSDC: number;
  overallScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [report, setReport] = useState<ReportType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [envOk, setEnvOk] = useState(true); // assume ok until checked

  // Fetch recent jobs on mount and after each run
  const fetchRecentJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/swarm/jobs?limit=10');
      if (res.ok) {
        const data = await res.json();
        setRecentJobs(data.jobs ?? []);
      }
    } catch {
      // Silently fail — not critical
    }
  }, []);

  useEffect(() => {
    fetchRecentJobs();
  }, [fetchRecentJobs]);

  // Check env credentials on mount
  useEffect(() => {
    fetch('/api/v1/env-check')
      .then((r) => r.json())
      .then((d) => setEnvOk(d.ok ?? true))
      .catch(() => setEnvOk(true)); // fail open — don't show banner on network error
  }, []);

  const handleRunSwarm = useCallback(async (url: string) => {
    setIsRunning(true);
    setReport(null);
    setSettlements([]);
    setStatusMessage('Creating swarm job...');

    // Initialize all agents to "queued"
    const initialOutputs: AgentOutput[] = AGENTS.map((a) => ({
      agentId: a.id,
      status: 'queued' as const,
      result: null,
      qualityScore: null,
      startedAt: null,
      completedAt: null,
      error: null,
    }));
    setOutputs(initialOutputs);

    try {
      const res = await fetch('/api/v1/swarm/run/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          agents: [],
          budgetCap: 0.10,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      // Read the SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            setStatusMessage('Swarm run complete!');
            continue;
          }

          try {
            const event: SSEEvent = JSON.parse(data);
            handleSSEEvent(event);
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error('Swarm run failed:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setOutputs((prev) =>
        prev.map((o) => ({
          ...o,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      );
    } finally {
      setIsRunning(false);
      // Refresh recent jobs after run completes
      fetchRecentJobs();
    }
  }, [fetchRecentJobs]);

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'job:started':
        setStatusMessage(`Job ${event.job?.id} started — fetching page content...`);
        break;

      case 'page:fetched':
        setStatusMessage(
          event.contentLength > 0
            ? `Page fetched (${(event.contentLength / 1024).toFixed(1)}KB) — dispatching agents...`
            : 'Page content unavailable — agents will analyze based on URL...'
        );
        break;

      case 'agent:started':
        setStatusMessage(`Running: ${event.agentName}...`);
        setOutputs((prev) =>
          prev.map((o) =>
            o.agentId === event.agentId
              ? { ...o, status: 'running' as const, startedAt: new Date().toISOString() }
              : o
          )
        );
        break;

      case 'agent:completed': {
        const output = event.output as AgentOutput;
        setOutputs((prev) =>
          prev.map((o) => (o.agentId === output.agentId ? output : o))
        );
        if (output.status === 'complete') {
          const agent = AGENTS.find((a) => a.id === output.agentId);
          setStatusMessage(`${agent?.name ?? output.agentId} complete (score: ${output.qualityScore})`);
        } else {
          setStatusMessage(`${output.agentId} failed: ${output.error}`);
        }
        break;
      }

      case 'settlement:completed': {
        const settlement = event.settlement as SettlementRecord;
        setSettlements((prev) => [...prev, settlement]);
        setStatusMessage(`Settled $${parseFloat(settlement.amountUSDC).toFixed(3)} for ${settlement.agentName}`);
        break;
      }

      case 'settlement:skipped':
        setStatusMessage(`Settlement skipped for ${event.agentId}: ${event.reason}`);
        break;

      case 'report:generated':
        setReport(event.report as ReportType);
        setStatusMessage('Report generated!');
        break;

      case 'webhook:sent':
        setStatusMessage(
          event.success
            ? `Webhook delivered to ${event.url}`
            : `Webhook failed: ${event.url}`
        );
        break;

      case 'job:completed':
        setStatusMessage('Swarm run complete!');
        break;

      case 'job:error':
        setStatusMessage(`Error: ${event.error}`);
        break;
    }
  }, []);

  function formatTimeAgo(isoStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function getScoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 70) return 'recent-jobs__score--high';
    if (score >= 40) return 'recent-jobs__score--mid';
    return 'recent-jobs__score--low';
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header__badge">
          <span className="header__badge-dot" />
          Arc Testnet · Live
        </div>
        <h1 className="header__title">Agentic SEO &amp; AEO Swarm</h1>
        <p className="header__subtitle">
          8 AI agents · Circle Nanopayments · Arc L1 Settlement
        </p>
      </header>

      {/* Status message */}
      {statusMessage && (
        <div className="status-banner">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Environment warning - only show when env check fails */}
      {!isRunning && !report && !envOk && (
        <div className="env-banner">
          <span>
            Configure your <code>.env.local</code> credentials to enable live
            Circle SDK + Gemini AI integration. Without <code>GEMINI_API_KEY</code>,
            agents will return errors.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card__label">Total Agents</div>
          <div className="stat-card__value stat-card__value--violet">8</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Cost Per Run</div>
          <div className="stat-card__value stat-card__value--emerald">
            ${TOTAL_SWARM_COST.toFixed(3)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Finality</div>
          <div className="stat-card__value stat-card__value--cyan">&lt; 1s</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Settlements</div>
          <div className="stat-card__value stat-card__value--amber">
            {settlements.filter((s) => s.state === 'COMPLETE').length}
          </div>
        </div>
      </div>

      {/* Swarm Runner */}
      <SwarmRunner onSubmit={handleRunSwarm} isRunning={isRunning} />

      {/* Main Grid */}
      <div className="dashboard-grid">
        <div>
          <AgentStatusGrid outputs={outputs} />
          <ConsolidatedReport report={report} />
        </div>
        <TransactionLog settlements={settlements} />
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="recent-jobs glass-card" style={{ marginTop: 32 }}>
          <div className="glass-card__header">
            <h2 className="glass-card__title">
              Recent Jobs
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {recentJobs.length} job{recentJobs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="glass-card__body" style={{ padding: 0 }}>
            <table className="recent-jobs__table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Agents</th>
                  <th>Score</th>
                  <th>Cost</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <span className="recent-jobs__id">
                        {job.id.slice(0, 16)}…
                      </span>
                    </td>
                    <td>
                      <span className="recent-jobs__url" title={job.url}>
                        {new URL(job.url).hostname}
                      </span>
                    </td>
                    <td>
                      <span className={`recent-jobs__badge recent-jobs__badge--${job.status}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-emerald)' }}>
                        {job.completedAgents}
                      </span>
                      {job.failedAgents > 0 && (
                        <>
                          {' / '}
                          <span style={{ color: 'var(--accent-rose)' }}>
                            {job.failedAgents}
                          </span>
                        </>
                      )}
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' '}/ {job.agentCount}
                      </span>
                    </td>
                    <td>
                      {job.overallScore !== null ? (
                        <span className={`recent-jobs__score ${getScoreClass(job.overallScore)}`}>
                          {job.overallScore}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="recent-jobs__cost">
                        ${job.totalCostUSDC.toFixed(3)}
                      </span>
                    </td>
                    <td>
                      <span className="recent-jobs__time">
                        {formatTimeAgo(job.startedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
