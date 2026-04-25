'use client';

import { useState } from 'react';

interface SwarmRunnerProps {
  onSubmit: (url: string) => void;
  isRunning: boolean;
}

export default function SwarmRunner({ onSubmit, isRunning }: SwarmRunnerProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isRunning) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="swarm-runner glass-card">
      <div className="glass-card__header">
        <h2 className="glass-card__title">
          Launch Swarm
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          $0.054 / run
        </span>
      </div>
      <div className="glass-card__body">
        <form className="swarm-runner__form" onSubmit={handleSubmit}>
          <div className="swarm-runner__input-wrapper">
            <input
              id="swarm-url-input"
              type="url"
              className="swarm-runner__input"
              style={{ paddingLeft: '16px' }}
              placeholder="Enter URL to optimize (e.g. https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isRunning}
              required
            />
          </div>
          <button
            id="swarm-run-button"
            type="submit"
            className="swarm-runner__button"
            disabled={isRunning || !url.trim()}
          >
            {isRunning ? (
              <>Running...</>
            ) : (
              <>Run Swarm</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
