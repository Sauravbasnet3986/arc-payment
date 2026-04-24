# AGENTS.md — AI Agent Project Context

> This file provides structured context for AI coding assistants (Codex, Gemini, GPT, Copilot, etc.)
> working on this codebase. Read this **before** making any changes.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Project** | Agentic SEO & AEO Optimization Swarm |
| **Version** | 1.0.0 (Testnet) |
| **Framework** | Next.js 16 + TypeScript (App Router) |
| **Blockchain** | Arc Layer-1 (EVM-compatible, Malachite BFT consensus) |
| **Payment** | Circle Developer-Controlled Wallets SDK + Nanopayments (x402) |
| **AI Models** | Gemini 3 Pro / Flash / Vision |
| **Status** | Arc Testnet + Circle Testnet — **no mainnet, no real funds** |

---

## Architecture — 6 Layers

```
Layer 1  Client         src/app/ + src/components/     Next.js dashboard + REST API
Layer 2  Orchestration   src/lib/orchestrator/          Task decomposition, quality validation
Layer 3  Agent Swarm     src/lib/agents/                8 specialized AI agents (SEO × 4, AEO × 4)
Layer 4  AI Intelligence src/lib/gemini/                Gemini API client (Pro, Flash, Vision)
Layer 5  Payment         src/lib/circle/                Circle SDK, wallets, settlement, nanopayments
Layer 6  Blockchain      src/lib/arc/                   Arc L1 config, ethers.js provider, ERC-8004
```

---

## Directory Structure

```
src/
├── app/
│   ├── api/v1/swarm/
│   │   ├── run/route.ts              POST  — trigger swarm run
│   │   ├── run/stream/route.ts       POST  — SSE streaming for real-time progress
│   │   ├── status/[jobId]/route.ts   GET   — job status (JSON or SSE)
│   │   └── jobs/route.ts             GET   — recent jobs list
│   ├── page.tsx                      Dashboard (client component, holds all state)
│   ├── layout.tsx                    Root layout + SEO metadata
│   └── globals.css                   Full design system (dark, glassmorphism, animations)
├── components/
│   ├── SwarmRunner.tsx               URL input form
│   ├── AgentStatusGrid.tsx           8 agent status cards
│   ├── TransactionLog.tsx            Settlement tx feed
│   └── ConsolidatedReport.tsx        Report viewer with scores
├── lib/
│   ├── env.ts                        ⭐ ENV VALIDATION — root dependency for all server modules
│   ├── agents/
│   │   ├── registry.ts               AGENTS[] array — all 8 configs (id, name, wing, model, cost, walletAddress)
│   │   ├── base.ts                   Abstract BaseAgent class with execute() lifecycle
│   │   ├── implementations/          8 concrete agent classes + factory
│   │   └── index.ts                  Barrel
│   ├── arc/
│   │   ├── config.ts                 ARC_CONFIG object + explorer URL builders
│   │   ├── provider.ts               ethers.js JsonRpcProvider singleton for Arc testnet
│   │   ├── identity.ts               ERC-8004 agent identity contract utilities
│   │   └── index.ts                  Barrel
│   ├── circle/
│   │   ├── client.ts                 Circle SDK singleton (dynamic import, null if no credentials)
│   │   ├── wallets.ts                createAgentWallets(), getWalletBalance(), listWalletTransactions()
│   │   ├── settlement.ts             settleAgentTask() — quality gate → USDC transfer → poll
│   │   ├── nanopayments.ts           EIP-3009 off-chain signing for x402 protocol
│   │   └── index.ts                  Barrel
│   ├── gemini/
│   │   └── client.ts                 callGemini() + callGeminiVision() with retry + backoff
│   └── orchestrator/
│       ├── index.ts                  createSwarmJob(), executeSwarmJob(), assembleReport()
│       ├── jobStore.ts               In-memory Map<string, SwarmJob> with TTL eviction
│       └── webhook.ts               Fire-and-forget webhook emitter with HMAC + retries
└── types/
    ├── agent.ts                      AgentConfig (+ walletAddress), AgentOutput, AgentStatus
    ├── payment.ts                    SettlementRecord, TransactionState, NanopaymentSignature, WalletInfo
    ├── swarm.ts                      SwarmJob (+ webhookUrl), SwarmRunRequest, ConsolidatedReport, WebhookPayload
    ├── circle-sdk.d.ts               Stub type declarations (SDK not installed)
    └── index.ts                      Barrel
```

---

## Critical Rules

### 1. Environment Variables
- **All server-side config** flows through `src/lib/env.ts` — never read `process.env` directly elsewhere.
- The app boots in **demo mode** when credentials are missing. `env.isValid` is `false` and warnings print.
- Required vars: `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `GEMINI_API_KEY`, `ORCHESTRATOR_WALLET_ID`, `ARC_TESTNET_RPC`, `ARC_TESTNET_CHAIN_ID`, `ARC_TESTNET_USDC`.
- See `.env.example` for the full reference.

### 2. Circle SDK
- The `@circle-fin/developer-controlled-wallets` package is **NOT installed** yet.
- `src/types/circle-sdk.d.ts` provides stub type declarations so the project compiles.
- `circle/client.ts` uses **dynamic import** — returns `null` gracefully when the SDK isn't available.
- When adding Circle SDK: `npm install @circle-fin/developer-controlled-wallets` then fill `.env.local`.
- Agent wallet addresses can be set via `walletAddress` in `registry.ts` — demo mode used when empty.

### 3. Agent Pattern
- All agents extend `BaseAgent` (abstract class in `agents/base.ts`).
- Each agent **must** implement `buildPrompt(context)` — the LLM prompt for its specialization.
- Can optionally override: `getSystemInstruction()`, `parseResult()`, `scoreOutput()`.
- The registry in `agents/registry.ts` defines all 8 agents with their configs.
- All 8 concrete agent implementations live in `agents/implementations/`.
- Factory function `createAgent(config)` creates instances from config.

### 4. Blockchain Constants
- **USDC token address** on Arc Testnet: `0x3600000000000000000000000000000000000000`
- **Gas is paid in USDC**, not ETH — agent wallets need only USDC balance.
- **ERC-8004 contract address** must be fetched from `docs.arc.network/arc/references/contract-addresses`.
- Explorer: `https://testnet.arcscan.app`

### 5. Dashboard
- `page.tsx` is a **client component** (`'use client'`) that holds all UI state.
- Uses SSE streaming from `POST /api/v1/swarm/run/stream` for real-time progress.
- Components receive data via props from `page.tsx` — no global state management.
- "Recent Jobs" section fetches from `GET /api/v1/swarm/jobs` on mount.

### 6. Data Flow
```
SwarmRunner → page.tsx handleRunSwarm()
  → POST /api/v1/swarm/run/stream (SSE — streams real-time progress events)
  → orchestrator creates job, fetches page, dispatches 8 agents in parallel via Gemini
  → Agents complete → quality validation → Circle settlement (or demo mode)
  → Report assembled → webhook fired (if webhookUrl provided)
  → page.tsx updates AgentStatusGrid, TransactionLog, ConsolidatedReport via SSE events
```

### 7. Job Store
- In-memory `Map<string, SwarmJob>` in `orchestrator/jobStore.ts`.
- Jobs persist for 1 hour, max 100 entries (FIFO eviction).
- Persisted at every state transition (pending → running → settling → complete/failed).
- `GET /api/v1/swarm/status/[jobId]` returns real data from store (supports JSON or SSE).

### 8. Webhooks
- If `webhookUrl` is provided in the run request, a `WebhookPayload` is POSTed on completion.
- HMAC-SHA256 signed via `X-Swarm-Signature` header (when `WEBHOOK_SECRET` is set).
- 3 retry attempts with exponential backoff. Fire-and-forget — never blocks the job.

---

## Key Type Relationships

```
AgentConfig (agent.ts)
  └─ used by: AGENTS[] in registry.ts, BaseAgent, orchestrator, API route, AgentStatusGrid

AgentOutput (agent.ts)
  └─ used by: SwarmJob.agentOutputs, BaseAgent.execute() return, page.tsx state

SettlementRecord (payment.ts)
  └─ used by: settleAgentTask() return, SwarmJob.settlements, TransactionLog props

SwarmJob (swarm.ts)  ← imports AgentOutput + SettlementRecord
  └─ used by: createSwarmJob() return, page.tsx (partial)

ConsolidatedReport (swarm.ts)
  └─ used by: assembleReport() return, ConsolidatedReport component props
```

---

## Commands

```bash
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build (TypeScript + static generation)
npm run start      # Start production server
npm run lint       # Run ESLint
```

---

## Completed

1. ✅ **Concrete agent implementations** — 8 classes in `agents/implementations/`
2. ✅ **Orchestrator dispatch loop** — parallel `agent.execute()` + Gemini API
3. ✅ **Settlement integration** — `settleAgentTask()` called after quality gate
4. ✅ **Persistent job storage** — in-memory store, status API returns real data
5. ✅ **SSE streaming** — real-time progress via `/api/v1/swarm/run/stream`
6. ✅ **Webhook emitter** — POST `WebhookPayload` on completion with HMAC signing
7. ✅ **ERC-8004 identity** — `validateAgentIdentity()` wired before settlement (grace mode when no registry)
8. ✅ **Agent wallet addresses** — `AgentConfig.walletAddress` used in settlement (demo mode when empty)
9. ✅ **Production API Rate Limiting** — token-bucket middleware
10. ✅ **Error Recovery** — `MAX_AGENT_RETRIES` on transient errors in dispatch loop
11. ✅ **Automated Wallet Setup** — `POST /api/v1/admin/wallets/setup` to provision agent wallets

## What's Not Wired Yet (Manual Deployment Steps)

1. **Real wallet creation** — call `/api/v1/admin/wallets/setup` to create wallets
2. **Fund wallets** — via faucet.circle.com using generated addresses
3. **ERC-8004 registry deployment** — deploy contract, set `ERC8004_REGISTRY_ADDRESS`
4. **Mainnet migration** — when Arc mainnet launches

---

## Conventions

- **Imports**: Use `@/` path alias (maps to `src/`). Types use `import type`.
- **Barrel exports**: Each `lib/` subdirectory has `index.ts` re-exporting all public API.
- **Dynamic imports**: Used for `ethers` and `@circle-fin` to allow graceful degradation.
- **Error handling**: All external calls (Circle, Gemini, Arc) use try/catch with console logging.
- **Styling**: Vanilla CSS with BEM-like naming (`.block__element--modifier`). No Tailwind.
- **Components**: Client components (`'use client'`), props-driven, no global state.
