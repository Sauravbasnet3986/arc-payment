'use client';

import type { SettlementRecord } from '@/types/payment';

interface TransactionLogProps {
  settlements: SettlementRecord[];
}

export default function TransactionLog({ settlements }: TransactionLogProps) {
  return (
    <div className="glass-card">
      <div className="glass-card__header">
        <h2 className="glass-card__title">
          <span>📋</span> Transaction Log
        </h2>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Arc Testnet
        </span>
      </div>
      <div className="glass-card__body">
        {settlements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">💎</div>
            <p className="empty-state__text">
              No transactions yet. Run a swarm to see USDC settlements here.
            </p>
          </div>
        ) : (
          <div className="tx-log">
            {settlements.map((tx, i) => (
              <div key={tx.id || i} className="tx-item">
                <div
                  className={`tx-item__icon ${
                    tx.state === 'COMPLETE'
                      ? 'tx-item__icon--settlement'
                      : 'tx-item__icon--pending'
                  }`}
                >
                  {tx.state === 'COMPLETE' ? '✅' : '⏳'}
                </div>
                <div className="tx-item__body">
                  <div className="tx-item__agent">{tx.agentName}</div>
                  <div className="tx-item__detail">
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
                    >
                      View on ArcScan ↗
                    </a>
                  )}
                </div>
                <div className="tx-item__amount">
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
