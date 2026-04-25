'use client';

import { SettlementRecord } from '@/types/payment';
import { AgentOutput } from '@/types/agent';
import { AGENTS } from '@/lib/agents/registry';

interface CostSummaryProps {
  settlements: SettlementRecord[];
  outputs: AgentOutput[];
}

export default function CostSummary({ settlements, outputs }: CostSummaryProps) {
  const settledAmount = settlements.reduce((sum, s) => sum + parseFloat(s.amountUSDC), 0);

  // Calculate projected cost for agents that haven't settled yet but are completed/running
  const projectedRemaining = outputs
    .filter(o => !settlements.some(s => s.agentId === o.agentId))
    .reduce((sum, o) => {
      const agent = AGENTS.find(a => a.id === o.agentId);
      return sum + (agent?.costUSDC ?? 0);
    }, 0);

  const totalProjected = settledAmount + projectedRemaining;

  // Wing-based breakdown
  const seoSpent = settlements
    .filter(s => AGENTS.find(a => a.id === s.agentId)?.wing === 'SEO')
    .reduce((sum, s) => sum + parseFloat(s.amountUSDC), 0);

  const aeoSpent = settlements
    .filter(s => AGENTS.find(a => a.id === s.agentId)?.wing === 'AEO')
    .reduce((sum, s) => sum + parseFloat(s.amountUSDC), 0);

  return (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <div className="glass-card__header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <h2 className="glass-card__title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Cost Breakdown
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            ≤ $0.01 / TASK
          </span>
          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            USDC
          </span>
        </div>
      </div>
      
      <div className="glass-card__body" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
          {/* Left: Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Projected Cost
              </div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                ${totalProjected.toFixed(3)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Settled</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  ${settledAmount.toFixed(3)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pending</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  ${projectedRemaining.toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Wing Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <div style={{
              padding: '16px',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '4px solid var(--accent-violet)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>SEO Wing</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: 'var(--accent-violet)' }}>${seoSpent.toFixed(3)}</span>
            </div>
            <div style={{
              padding: '16px',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '4px solid var(--accent-cyan)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>AEO Wing</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)' }}>${aeoSpent.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
            <span>Settlement Progress</span>
            <span style={{ color: 'var(--text-primary)' }}>{Math.round((settledAmount / (totalProjected || 1)) * 100)}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'var(--gradient-success)',
              width: `${(settledAmount / (totalProjected || 1)) * 100}%`,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
