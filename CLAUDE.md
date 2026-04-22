# CLAUDE.md — AI Agent Project Context

> This file provides structured context for AI coding assistants (Claude, Gemini, GPT, Copilot, etc.)
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
│   │   └── status/[jobId]/route.ts   GET   — job status (stub)
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
│   │   ├── registry.ts               AGENTS[] array — all 8 configs (id, name, wing, model, cost)
│   │   ├── base.ts                   Abstract BaseAgent class with execute() lifecycle
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
│       └── index.ts                  createSwarmJob(), assembleReport(), calculateTotalCost()
└── types/
    ├── agent.ts                      AgentConfig, AgentOutput, AgentStatus, AgentWing, GeminiModel
    ├── payment.ts                    SettlementRecord, TransactionState, NanopaymentSignature, WalletInfo
    ├── swarm.ts                      SwarmJob, SwarmRunRequest, ConsolidatedReport, ReportSection, WebhookPayload
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

### 3. Agent Pattern
- All agents extend `BaseAgent` (abstract class in `agents/base.ts`).
- Each agent **must** implement `buildPrompt(context)` — the LLM prompt for its specialization.
- Can optionally override: `getSystemInstruction()`, `parseResult()`, `scoreOutput()`.
- The registry in `agents/registry.ts` defines all 8 agents with their configs.
- **No concrete agent implementations exist yet** — only the base class and registry.

### 4. Blockchain Constants
- **USDC token address** on Arc Testnet: `0x3600000000000000000000000000000000000000`
- **Gas is paid in USDC**, not ETH — agent wallets need only USDC balance.
- **ERC-8004 contract address** must be fetched from `docs.arc.network/arc/references/contract-addresses`.
- Explorer: `https://testnet.arcscan.app`

### 5. Dashboard
- `page.tsx` is a **client component** (`'use client'`) that holds all UI state.
- Currently runs a **simulated demo** — agent execution is faked with `setTimeout` delays.
- The dashboard calls `POST /api/v1/swarm/run` which creates a real job via the orchestrator.
- Components receive data via props from `page.tsx` — no global state management.

### 6. Data Flow
```
SwarmRunner → page.tsx handleRunSwarm()
  → POST /api/v1/swarm/run (validates, calls createSwarmJob from orchestrator)
  → Returns job { id, status, agentCount, estimatedCost }
  → page.tsx simulates agent execution (future: real Gemini calls via BaseAgent)
  → Updates AgentStatusGrid, TransactionLog, ConsolidatedReport via React state
```

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

## What's Not Wired Yet (TODO)

1. **Concrete agent implementations** — 8 classes extending `BaseAgent` with real prompts
2. **Orchestrator dispatch loop** — parallel `agent.execute()` calls + Gemini API
3. **Settlement integration** — call `settleAgentTask()` after each agent pass
4. **Persistent job storage** — `/api/v1/swarm/status/[jobId]` returns placeholder
5. **WebSocket / SSE** — real-time agent progress updates to dashboard
6. **Webhook emitter** — POST results to `webhookUrl` on job completion
7. **ERC-8004 identity** — deploy contracts, wire `validateAgentIdentity()` before settlement
8. **Circle SDK install** — `npm install @circle-fin/developer-controlled-wallets`

---

## Conventions

- **Imports**: Use `@/` path alias (maps to `src/`). Types use `import type`.
- **Barrel exports**: Each `lib/` subdirectory has `index.ts` re-exporting all public API.
- **Dynamic imports**: Used for `ethers` and `@circle-fin` to allow graceful degradation.
- **Error handling**: All external calls (Circle, Gemini, Arc) use try/catch with console logging.
- **Styling**: Vanilla CSS with BEM-like naming (`.block__element--modifier`). No Tailwind.
- **Components**: Client components (`'use client'`), props-driven, no global state.
