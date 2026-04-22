'use client';

import type { ConsolidatedReport as ReportType } from '@/types/swarm';

interface ConsolidatedReportProps {
  report: ReportType | null;
}

export default function ConsolidatedReport({ report }: ConsolidatedReportProps) {
  if (!report) {
    return (
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <div className="glass-card__header">
          <h2 className="glass-card__title">
            <span>📊</span> Consolidated Report
          </h2>
        </div>
        <div className="glass-card__body">
          <div className="empty-state">
            <div className="empty-state__icon">📄</div>
            <p className="empty-state__text">
              Report will appear here after a swarm run completes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ marginTop: '24px' }}>
      <div className="glass-card__header">
        <h2 className="glass-card__title">
          <span>📊</span> Consolidated Report
        </h2>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {report.url}
        </span>
      </div>
      <div className="glass-card__body">
        {/* Score overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-violet-glow)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              SEO Score
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-violet)' }}>
              {report.seoScore}
            </div>
          </div>
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-cyan-glow)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              AEO Score
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {report.aeoScore}
            </div>
          </div>
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-emerald-glow)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              Overall
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {report.overallScore}
            </div>
          </div>
        </div>

        {/* Sections */}
        {report.sections.map((section) => (
          <div
            key={section.agentId}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '12px',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {section.agentName}
              </span>
              <span
                className={`agent-card__wing agent-card__wing--${section.wing.toLowerCase()}`}
              >
                {section.wing}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              {section.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
