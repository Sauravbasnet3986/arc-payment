'use client';

import type { SettlementRecord } from '@/types/payment';

interface TransactionLogProps {
  settlements: SettlementRecord[];
}

export default function TransactionLog({ settlements }: TransactionLogProps) {
  return (
    <div className="glass-card">
      <div className="glass-card__header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <h2 className="glass-card__title" style={{ fontSize: '18px' }}>
          Transaction Log
        </h2>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            padding: '4px 8px',
            background: 'var(--bg-glass)',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)'
          }}
        >
          Arc Testnet
        </span>
      </div>
      <div className="glass-card__body" style={{ padding: '24px' }}>
        {settlements.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-state__icon" style={{ opacity: 0.5 }}>Tx</div>
            <p className="empty-state__text">
              No transactions yet. Run a swarm to see USDC settlements here.
            </p>
          </div>
        ) : (
          <div className="tx-log" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settlements.map((tx, i) => (
              <div 
                key={tx.id || i} 
                className="tx-item" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '16px', 
                  background: 'var(--bg-glass)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}
              >
                <div
                  className={`tx-item__icon ${
                    tx.state === 'COMPLETE'
                      ? 'tx-item__icon--settlement'
                      : 'tx-item__icon--pending'
                  }`}
                  style={{ flexShrink: 0 }}
                >
                  {tx.state === 'COMPLETE' ? <span style={{ color: 'var(--accent-emerald)' }}>●</span> : <span style={{ color: 'var(--accent-amber)' }}>○</span>}
                </div>
                <div className="tx-item__body" style={{ flexGrow: 1, minWidth: 0 }}>
                  <div className="tx-item__agent" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {tx.agentName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="tx-item__detail" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {tx.state === 'COMPLETE'
                        ? 'Settlement confirmed'
                        : `Status: ${tx.state}`}
                    </div>
                    {tx.explorerUrl && (
                      <a
                        href={tx.explorerUrl}
                        className="tx-item__link"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        View on ArcScan ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="tx-item__amount" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ${parseFloat(tx.amountUSDC).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
