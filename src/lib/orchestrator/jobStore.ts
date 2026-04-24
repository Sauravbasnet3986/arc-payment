/**
 * Job Store — In-Memory Persistent Job Storage
 *
 * Stores SwarmJob instances in a server-side Map so the
 * status API can return real job data. Jobs are evicted
 * after TTL expires or when the store exceeds capacity.
 *
 * Sufficient for testnet — swap with Redis/PostgreSQL
 * for production by implementing the same interface.
 */

import type { SwarmJob } from '@/types/swarm';

// ── Configuration ───────────────────────────────────────────
const MAX_JOBS = 100;
const TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Store ───────────────────────────────────────────────────
interface StoredJob {
  job: SwarmJob;
  createdAt: number;
}

const store = new Map<string, StoredJob>();

/**
 * Evict expired entries and enforce capacity limit.
 */
function evict(): void {
  const now = Date.now();

  // 1. Remove expired entries
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL_MS) {
      store.delete(id);
    }
  }

  // 2. Enforce capacity — remove oldest if over limit
  if (store.size > MAX_JOBS) {
    const sorted = [...store.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );
    const toRemove = sorted.slice(0, store.size - MAX_JOBS);
    for (const [id] of toRemove) {
      store.delete(id);
    }
  }
}

/**
 * Save or update a job in the store.
 */
export function saveJob(job: SwarmJob): void {
  const existing = store.get(job.id);
  store.set(job.id, {
    job: structuredClone(job),
    createdAt: existing?.createdAt ?? Date.now(),
  });
  evict();
}

/**
 * Retrieve a job by ID.
 * Returns null if the job doesn't exist or has expired.
 */
export function getJob(jobId: string): SwarmJob | null {
  const entry = store.get(jobId);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(jobId);
    return null;
  }

  return entry.job;
}

/**
 * List recent jobs, newest first.
 * @param limit Maximum number of jobs to return (default: 20)
 */
export function listJobs(limit = 20): SwarmJob[] {
  evict();

  return [...store.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((entry) => entry.job);
}

/**
 * Delete a job from the store.
 */
export function deleteJob(jobId: string): boolean {
  return store.delete(jobId);
}

/**
 * Get the current number of stored jobs.
 */
export function getJobCount(): number {
  evict();
  return store.size;
}
