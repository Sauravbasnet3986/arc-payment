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
            Consolidated Report
          </h2>
        </div>
        <div className="glass-card__body">
          <div className="empty-state">
            <div className="empty-state__icon" style={{ opacity: 0.5 }}>Report</div>
            <p className="empty-state__text">
              Report will appear here after a swarm run completes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ marginTop: '32px', marginBottom: '64px' }}>
      <div className="glass-card__header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div>
          <h2 className="glass-card__title" style={{ fontSize: '20px', marginBottom: '6px' }}>
            Consolidated Swarm Report
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Target: <a href={report.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>{report.url}</a>
          </div>
        </div>
      </div>
      
      <div className="glass-card__body" style={{ padding: '32px' }}>
        {/* Score overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
          marginBottom: '40px',
        }}>
          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-violet-glow)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              SEO Score
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-violet)' }}>
              {report.seoScore}
            </div>
          </div>
          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-cyan-glow)',
            border: '1px solid rgba(6, 182, 212, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              AEO Score
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {report.aeoScore}
            </div>
          </div>
          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-emerald-glow)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Overall Quality
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {report.overallScore}
            </div>
          </div>
          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-amber-glow)',
            border: '1px solid rgba(245, 158, 11, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Total Execution Cost
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-amber)' }}>
              ${report.totalCostUSDC.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {report.sections.map((section) => {
            const startTime = section.startedAt ? new Date(section.startedAt) : null;
            const endTime = section.completedAt ? new Date(section.completedAt) : null;
            const durationStr = (startTime && endTime) 
              ? `${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1)}s`
              : 'N/A';
              
            return (
            <div
              key={section.agentId}
              style={{
                padding: '28px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Highlight bar at top */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, height: '3px',
                background: section.wing === 'SEO' ? 'var(--gradient-primary)' : 'var(--gradient-secondary)',
                opacity: 0.9
              }} />

              {/* Header: Agent Name, Wing, Task, Cost */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {section.agentName}
                    </h3>
                    <span className={`agent-card__wing agent-card__wing--${section.wing.toLowerCase()}`}>
                      {section.wing}
                    </span>
                  </div>
                  {/* Job Task clearly displayed here */}
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '6px' }}>Task:</span>
                    {section.title}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '4px' }}>
                    ${section.costUSDC.toFixed(3)} USDC
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Runtime: {durationStr}
                  </div>
                </div>
              </div>

              {/* Grid for Findings & Recommendations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Findings / Mistakes */}
                <div style={{ background: 'rgba(239, 68, 68, 0.02)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-rose)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                    Mistakes / Flaws Found
                  </div>
                  {section.findings && section.findings.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {section.findings.map((finding, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{finding}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No critical issues found.</div>
                  )}
                </div>

                {/* Recommendations / Fixes */}
                <div style={{ background: 'rgba(16, 185, 129, 0.02)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                    Fixes / Recommendations
                  </div>
                  {section.recommendations && section.recommendations.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {section.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No recommendations provided.</div>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
