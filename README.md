<p align="center">
  <img src="https://img.shields.io/badge/Arc_L1-Testnet_Live-8b5cf6?style=for-the-badge&logo=ethereum&logoColor=white" />
  <img src="https://img.shields.io/badge/Circle_SDK-Nanopayments-06b6d4?style=for-the-badge&logo=circle&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_3-Pro_%7C_Flash_%7C_Vision-f59e0b?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Cost-$0.054_per_run-10b981?style=for-the-badge" />
</p>

<h1 align="center">Agentic SEO & AEO Optimization Swarm</h1>

<p align="center">
  <strong>8 AI agents · USDC micro-payments · Sub-second finality</strong><br/>
  A 6-layer decentralized system where 8 specialized AI agents autonomously audit<br/>
  and optimize web pages, settling micro-payments on Arc Layer-1 via Circle Nanopayments.
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Agents](#agents)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Payment Flow](#payment-flow)
- [Development Roadmap](#development-roadmap)
- [Resources](#resources)
- [License](#license)

---

## Overview

The **Agentic SEO & AEO Optimization Swarm** is a production-ready scaffold for an autonomous AI agent system that:

1. **Accepts a URL** via dashboard or REST API
2. **Decomposes the task** into 8 parallel sub-tasks using Gemini 3 Pro
3. **Dispatches 8 specialized agents** (4 SEO + 4 AEO) for parallel analysis
4. **Validates quality** of each agent's output against configurable thresholds
5. **Settles USDC micro-payments** per agent task via Circle SDK on Arc L1
6. **Assembles a consolidated report** with SEO/AEO scores and recommendations

Total cost per full swarm run: **$0.054** — made viable by Arc's USDC-native gas model.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 1 — CLIENT INTERFACE                                      │
│  Next.js Dashboard  ·  REST API  ·  Webhook Emitter              │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 2 — ORCHESTRATION                                         │
│  Gemini 3 Pro  ·  Task Decomposer  ·  Quality Validator          │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 3 — AGENT SWARM                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │  Metadata    │ │  Keyword    │ │  Tech Health│ │  Link       ││
│  │  Architect   │ │  Specialist │ │  Monitor    │ │  Strategist ││
│  │  SEO · Flash │ │  SEO · Flash│ │  SEO · Flash│ │  SEO · Flash││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │  Schema      │ │  Snippet    │ │  Conversa-  │ │  Alt-Text   ││
│  │  Engineer    │ │  Transformer│ │  tional Aud.│ │  Agent      ││
│  │  AEO · Pro   │ │  AEO · Pro  │ │  AEO · Flash│ │  AEO · Vis. ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├──────────────────────────────────────────────────────────────────┤
│  LAYER 4 — AI INTELLIGENCE                                       │
│  Gemini 3 Pro  ·  Gemini 3 Flash  ·  Gemini 3 Vision            │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 5 — PAYMENT                                               │
│  Circle SDK  ·  Dev-Controlled Wallets  ·  Nanopayments  ·  x402│
├──────────────────────────────────────────────────────────────────┤
│  LAYER 6 — BLOCKCHAIN                                            │
│  Arc L1 (EVM)  ·  Malachite BFT  ·  < 1s Finality  ·  ERC-8004 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Agents

| # | Agent | Wing | Model | Task | Cost (USDC) |
|---|-------|------|-------|------|-------------|
| 1 | 🏗️ **Metadata Architect** | SEO | Flash | Meta-title & description rewrite for CTR | $0.008 |
| 2 | 🔑 **Keyword Specialist** | SEO | Flash | LSI keyword clusters + density scoring | $0.007 |
| 3 | 🩺 **Tech Health Monitor** | SEO | Flash | Core Web Vitals, broken links, mobile audit | $0.006 |
| 4 | 🔗 **Link Strategist** | SEO | Flash | Topical authority + internal link graph | $0.005 |
| 5 | 📐 **Schema Engineer** | AEO | Pro | JSON-LD structured data generation + validation | $0.009 |
| 6 | ✂️ **Snippet Transformer** | AEO | Pro | Featured snippet answer block restructuring | $0.008 |
| 7 | 🗣️ **Conversational Auditor** | AEO | Flash | Voice query alignment + NL rephrasing | $0.006 |
| 8 | 🖼️ **Alt-Text Agent** | AEO | Vision | Vision-based descriptive alt text generation | $0.005 |

> **Total: $0.054** per full swarm run (all 8 agents)

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/arc-payment.git
cd arc-payment

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)

# Start development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — the dashboard runs in **demo mode** until you configure live credentials.

### Adding Circle SDK (when ready)

```bash
npm install @circle-fin/developer-controlled-wallets
```

Then fill in `CIRCLE_API_KEY` and `CIRCLE_ENTITY_SECRET` in `.env.local`.

---

## Environment Variables

Create `.env.local` from the provided `.env.example`. All variables are documented below:

### Required — Circle SDK

| Variable | Source | Description |
|----------|--------|-------------|
| `CIRCLE_API_KEY` | [Circle Console](https://console.circle.com) → Keys | SDK + REST API authentication |
| `CIRCLE_ENTITY_SECRET` | [Circle Console](https://console.circle.com) → Entity | 32-byte hex secret for MPC key operations |
| `ORCHESTRATOR_WALLET_ID` | Circle SDK `createWallets()` response | Central wallet that pays agents |

### Required — Arc Blockchain

| Variable | Source | Description |
|----------|--------|-------------|
| `ARC_TESTNET_RPC` | [Arc Docs](https://docs.arc.network) or QuickNode | JSON-RPC endpoint for Arc testnet |
| `ARC_TESTNET_CHAIN_ID` | Arc References | Chain ID for EIP-3009 typed data signing |
| `ARC_TESTNET_USDC` | Default: `0x360...000` | USDC token contract address on Arc Testnet |

### Required — AI

| Variable | Source | Description |
|----------|--------|-------------|
| `GEMINI_API_KEY` | [AI Studio](https://ai.google.dev) | Gemini 3 Pro + Flash + Vision API access |

### Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `CIRCLE_WALLET_BLOCKCHAIN` | `ARC-TESTNET` | Blockchain identifier for Circle SDK |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public application URL |
| `QUALITY_THRESHOLD` | `70` | Minimum quality score (0-100) for payment release |
| `DEFAULT_BUDGET_CAP` | `0.10` | Maximum USDC spend per swarm run |

---

## API Reference

### `POST /api/v1/swarm/run`

Trigger a new swarm optimization run.

**Request:**
```json
{
  "url": "https://example.com",
  "agents": [],
  "budgetCap": 0.10,
  "webhookUrl": "https://your-app.com/webhook"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✅ | Target URL to analyze |
| `agents` | string[] | ❌ | Agent IDs to include (empty = all 8) |
| `budgetCap` | number | ❌ | Max USDC spend (default: 0.10) |
| `webhookUrl` | string | ❌ | Callback URL on completion |

**Response (202):**
```json
{
  "success": true,
  "job": {
    "id": "swarm-1713775200000-a1b2c3",
    "status": "pending",
    "url": "https://example.com",
    "agentCount": 8,
    "estimatedCost": 0.054
  }
}
```

### `GET /api/v1/swarm/status/:jobId`

Get the current status of a swarm run.

**Response (200):**
```json
{
  "jobId": "swarm-1713775200000-a1b2c3",
  "status": "pending",
  "agents": [],
  "settlements": []
}
```

> ⚠️ Currently returns placeholder data — persistent job storage not yet implemented.

---

## Project Structure

```
arc-payment/
├── .env.example                    # Environment variable template
├── .env.local                      # Local credentials (gitignored)
├── CLAUDE.md                       # AI assistant context
├── README.md                       # This file
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
│
└── src/
    ├── app/                        # Next.js App Router
    │   ├── api/v1/swarm/           # REST API endpoints
    │   │   ├── run/route.ts        #   POST — trigger swarm
    │   │   └── status/[jobId]/     #   GET  — job status
    │   │       └── route.ts
    │   ├── page.tsx                # Dashboard (main page)
    │   ├── layout.tsx              # Root layout + metadata
    │   └── globals.css             # Design system
    │
    ├── components/                 # React UI components
    │   ├── SwarmRunner.tsx         # URL input + launch button
    │   ├── AgentStatusGrid.tsx     # 8-agent visual grid
    │   ├── TransactionLog.tsx      # Settlement feed + explorer links
    │   └── ConsolidatedReport.tsx  # Report with SEO/AEO scores
    │
    ├── lib/                        # Core business logic
    │   ├── env.ts                  # Env validation (root dependency)
    │   ├── agents/                 # Layer 3 — Agent definitions
    │   │   ├── registry.ts         #   8 agent configs
    │   │   └── base.ts             #   Abstract BaseAgent class
    │   ├── arc/                    # Layer 6 — Arc blockchain
    │   │   ├── config.ts           #   Network config + explorer URLs
    │   │   ├── provider.ts         #   Ethers.js provider
    │   │   └── identity.ts         #   ERC-8004 contracts
    │   ├── circle/                 # Layer 5 — Circle payments
    │   │   ├── client.ts           #   SDK singleton
    │   │   ├── wallets.ts          #   Agent wallet management
    │   │   ├── settlement.ts       #   USDC transfer + quality gate
    │   │   └── nanopayments.ts     #   EIP-3009 off-chain signing
    │   ├── gemini/                 # Layer 4 — AI inference
    │   │   └── client.ts           #   Gemini API with retry
    │   └── orchestrator/           # Layer 2 — Task management
    │       └── index.ts            #   Job creation + report assembly
    │
    └── types/                      # TypeScript type definitions
        ├── agent.ts                # Agent config, output, status
        ├── payment.ts              # Settlement, transaction state
        ├── swarm.ts                # Job, report, webhook
        └── circle-sdk.d.ts         # SDK stub types
```

---

## Technology Stack

| Technology | Role | Why |
|------------|------|-----|
| **Next.js 16** | Full-stack framework | App Router, API routes, SSR, edge deployment |
| **TypeScript 5** | Type safety | End-to-end type safety across all 6 layers |
| **React 19** | UI framework | Client components with hooks for dashboard state |
| **ethers.js 6** | Blockchain client | Arc L1 provider, EIP-3009 typed data signing |
| **Arc L1** | Settlement chain | USDC-native gas, sub-second finality, EVM-compatible |
| **Circle SDK** | Wallet infrastructure | MPC wallets, USDC transfers, transaction management |
| **Circle Nanopayments** | Micro-payments | EIP-3009 off-chain signing, batched on-chain settlement |
| **x402 Protocol** | HTTP payments | Machine-to-machine payment standard (HTTP 402) |
| **Gemini 3** | AI inference | Pro (complex tasks), Flash (fast tasks), Vision (images) |
| **ERC-8004** | Agent identity | On-chain reputation, task proofs, identity validation |

### Why Arc L1?

Traditional EVM chains (Ethereum, Polygon) have gas costs of **$0.01–$5.00 per transaction** in volatile ETH. This makes sub-cent agent settlements economically impossible. Arc uses **USDC as native gas** with predictable, dollar-denominated fees at a fraction of a cent — the single architectural decision that makes the **$0.054 total-run pricing** viable.

---

## Payment Flow

```
                                    ┌─────────────────┐
                                    │  Agent completes │
                                    │  task via Gemini │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Orchestrator    │
                                    │  validates       │
                                    │  quality ≥ 70    │
                                    └────────┬────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          PASS ▼                      FAIL ▼
                    ┌──────────────┐              ┌──────────────┐
                    │  Circle SDK  │              │  No payment  │
                    │  createTx()  │              │  FAILED state│
                    │  USDC transfer│              └──────────────┘
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Arc L1      │
                    │  < 1s final  │
                    │  txHash      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Settlement  │
                    │  record with │
                    │  ArcScan URL │
                    └──────────────┘
```

---

## Development Roadmap

### ✅ Phase 1 — Foundation (Complete)
- [x] Next.js project with TypeScript
- [x] Full type system (agent, payment, swarm)
- [x] Environment validation with typed access
- [x] Circle SDK client scaffold (graceful null when no credentials)
- [x] Arc blockchain config + ethers.js provider
- [x] Gemini API client with retry logic
- [x] Agent registry (8 agents) + abstract BaseAgent
- [x] Orchestrator (job creation + report assembly)
- [x] REST API endpoints (run + status)
- [x] Premium dashboard UI with dark theme + glassmorphism
- [x] Demo simulation mode

### 🔲 Phase 2 — Agent Implementation
- [ ] 8 concrete agent classes with specialized prompts
- [ ] Real Gemini API integration per agent
- [ ] Custom quality scoring per agent type
- [ ] Orchestrator dispatch loop (parallel execution)

### 🔲 Phase 3 — Payment Integration
- [ ] Install Circle SDK + configure credentials
- [ ] Create 8 agent wallets on Arc Testnet
- [ ] Wire `settleAgentTask()` into orchestrator flow
- [ ] Fund wallets via faucet.circle.com
- [ ] End-to-end settlement test

### 🔲 Phase 4 — Production Readiness
- [ ] Persistent job storage (Redis or database)
- [ ] WebSocket/SSE for real-time dashboard updates
- [ ] Webhook emitter on job completion
- [ ] ERC-8004 identity contract deployment
- [ ] Rate limiting + error recovery
- [ ] Mainnet migration (when Arc mainnet launches)

---

## Resources

| Resource | URL |
|----------|-----|
| Arc Documentation | [docs.arc.network](https://docs.arc.network) |
| Arc Testnet Explorer | [testnet.arcscan.app](https://testnet.arcscan.app) |
| Arc Testnet Faucet | [faucet.circle.com](https://faucet.circle.com) |
| Circle Developer Console | [console.circle.com](https://console.circle.com) |
| Circle Developer Docs | [developers.circle.com](https://developers.circle.com) |
| Circle Wallets SDK | [npm: @circle-fin/developer-controlled-wallets](https://npmjs.com/package/@circle-fin/developer-controlled-wallets) |
| Circle Nanopayments | [circle.com/nanopayments](https://circle.com/nanopayments) |
| Circle Transfer Tutorial | [developers.circle.com/wallets/dev-controlled/transfer-tokens-across-wallets](https://developers.circle.com/wallets/dev-controlled/transfer-tokens-across-wallets) |
| Gemini API | [ai.google.dev](https://ai.google.dev) |
| QuickNode Arc RPC | [quicknode.com/docs/arc](https://quicknode.com/docs/arc) |

---

## Important Notices

> ⚠️ **TESTNET ONLY** — Arc mainnet has not launched (targeting 2026). Circle Nanopayments mainnet dates are TBD. All development uses **testnet USDC with no real value**. Do not deploy production funds.

> ⚠️ **SDK Required** — Circle Developer-Controlled Wallets require the `@circle-fin/developer-controlled-wallets` npm package. Raw REST API cannot handle entity secret encryption. Install the SDK before enabling payment features.

---

## License

Confidential — Internal use only.
