'use client';

import { AGENTS } from '@/lib/agents/registry';
import type { AgentOutput } from '@/types/agent';

interface AgentStatusGridProps {
  outputs: AgentOutput[];
}

export default function AgentStatusGrid({ outputs }: AgentStatusGridProps) {
  return (
    <div className="glass-card">
      <div className="glass-card__header">
        <h2 className="glass-card__title">
          <span>🤖</span> Agent Swarm
        </h2>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="agent-card__wing agent-card__wing--seo">SEO</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="agent-card__wing agent-card__wing--aeo">AEO</span>
          </span>
        </div>
      </div>
      <div className="glass-card__body">
        <div className="agent-grid">
          {AGENTS.map((agent) => {
            const output = outputs.find((o) => o.agentId === agent.id);
            const status = output?.status ?? 'idle';

            return (
              <div
                key={agent.id}
                id={`agent-card-${agent.slug}`}
                className={`agent-card agent-card--${agent.wing.toLowerCase()}`}
              >
                <div className="agent-card__top">
                  <span className="agent-card__icon">{agent.icon}</span>
                  <span
                    className={`agent-card__wing agent-card__wing--${agent.wing.toLowerCase()}`}
                  >
                    {agent.wing}
                  </span>
                </div>
                <div className="agent-card__name">{agent.name}</div>
                <div className="agent-card__task">{agent.task}</div>
                <div className="agent-card__footer">
                  <span className="agent-card__cost">
                    ${agent.costUSDC.toFixed(3)}
                  </span>
                  <span className="agent-card__status">
                    <span
                      className={`agent-card__status-dot agent-card__status-dot--${status}`}
                    />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
