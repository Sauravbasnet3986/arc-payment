'use client';

import { useState } from 'react';
import SwarmRunner from '@/components/SwarmRunner';
import AgentStatusGrid from '@/components/AgentStatusGrid';
import TransactionLog from '@/components/TransactionLog';
import ConsolidatedReport from '@/components/ConsolidatedReport';
import { AGENTS, TOTAL_SWARM_COST } from '@/lib/agents/registry';
import type { AgentOutput } from '@/types/agent';
import type { SettlementRecord } from '@/types/payment';
import type { ConsolidatedReport as ReportType } from '@/types/swarm';

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [report, setReport] = useState<ReportType | null>(null);

  const handleRunSwarm = async (url: string) => {
    setIsRunning(true);
    setReport(null);

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
      const res = await fetch('/api/v1/swarm/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          agents: [],
          budgetCap: 0.10,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      console.log('Swarm job created:', data);

      // Simulate agent execution for demo
      for (let i = 0; i < AGENTS.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setOutputs((prev) =>
          prev.map((o, idx) =>
            idx === i
              ? { ...o, status: 'running' as const, startedAt: new Date().toISOString() }
              : idx < i
              ? { ...o, status: 'complete' as const, qualityScore: 75 + Math.floor(Math.random() * 20) }
              : o
          )
        );
      }

      // Mark all complete
      await new Promise((r) => setTimeout(r, 400));
      const completedOutputs: AgentOutput[] = AGENTS.map((a) => ({
        agentId: a.id,
        status: 'complete' as const,
        result: { summary: `Analysis complete for ${a.name}` },
        qualityScore: 75 + Math.floor(Math.random() * 20),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: null,
      }));
      setOutputs(completedOutputs);

      // Generate demo settlements
      const demoSettlements: SettlementRecord[] = AGENTS.map((a) => ({
        id: `tx-${a.id}-${Date.now()}`,
        agentId: a.id,
        agentName: a.name,
        amountUSDC: a.costUSDC.toFixed(3),
        walletId: 'demo-wallet',
        destinationAddress: '0x' + 'a'.repeat(40),
        txHash: '0x' + Math.random().toString(16).slice(2, 66),
        state: 'COMPLETE' as const,
        explorerUrl: `https://testnet.arcscan.app/tx/0x${Math.random().toString(16).slice(2, 66)}`,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }));
      setSettlements(demoSettlements);

      // Generate demo report
      const seoAgents = completedOutputs.filter((o) => AGENTS.find((a) => a.id === o.agentId)?.wing === 'SEO');
      const aeoAgents = completedOutputs.filter((o) => AGENTS.find((a) => a.id === o.agentId)?.wing === 'AEO');
      const avgScore = (arr: AgentOutput[]) =>
        Math.round(arr.reduce((s, o) => s + (o.qualityScore ?? 0), 0) / arr.length);

      setReport({
        jobId: data.job?.id ?? 'demo',
        url,
        seoScore: avgScore(seoAgents),
        aeoScore: avgScore(aeoAgents),
        overallScore: avgScore(completedOutputs),
        sections: AGENTS.map((a) => ({
          agentId: a.id,
          agentName: a.name,
          wing: a.wing,
          title: a.task,
          findings: [],
          recommendations: [],
          data: {},
        })),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Swarm run failed:', error);
      setOutputs((prev) =>
        prev.map((o) => ({
          ...o,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header__badge">
          <span className="header__badge-dot" />
          Arc Testnet · Live
        </div>
        <h1 className="header__title">Agentic SEO & AEO Swarm</h1>
        <p className="header__subtitle">
          8 AI agents · Circle Nanopayments · Arc L1 Settlement
        </p>
      </header>

      {/* Environment warning */}
      <div className="env-banner">
        <span className="env-banner__icon">⚠️</span>
        <span>
          Running in <strong>demo mode</strong> — connect your <code>.env.local</code> credentials
          to enable live Circle SDK + Gemini AI integration.
        </span>
      </div>

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
    </div>
  );
}
