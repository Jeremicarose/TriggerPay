# TriggerPay

**Conditional payment infrastructure powered by NEAR Shade Agents and Chain Signatures.**

Set a real-world condition. When it triggers, receive an automatic cross-chain payout — verified in a Trusted Execution Environment, signed via NEAR Chain Signatures.

**Live Demo:** [https://triggerpay.vercel.app](https://triggerpay.vercel.app)

## Why TriggerPay?

Traditional conditional payments (insurance, escrow, bounties) rely on centralized oracles and single-chain settlement. TriggerPay replaces both:

- **TEE-verified monitoring** — A Shade Agent running in a Trusted Execution Environment monitors real-world APIs. Every check is cryptographically attested via the TEE's code hash, not a custom oracle.
- **Cross-chain payout via Chain Signatures** — When a condition is met, the agent signs an EVM transaction through NEAR's MPC network. Payouts land on Ethereum, Base, or Arbitrum — no bridges, no wrapping.
- **Only on NEAR** — Shade Agents + Chain Signatures is a capability unique to NEAR. No other chain offers TEE-native autonomous agents with native cross-chain signing.

## Demo Flow

1. **Create a trigger** — Enter a flight number, date, and EVM payout address
2. **Agent monitors** — The Shade Agent checks flight status via API
3. **Cancel the flight** — Click "Cancel Flight" in the Demo Control Panel
4. **Payout lands** — The agent detects the cancellation, signs an ETH transfer via NEAR Chain Signatures (MPC), and broadcasts it to the EVM chain. The transaction appears on Etherscan within seconds.

**Confirmed payout TX:** [0xa825481d...](https://sepolia.etherscan.io/tx/0xa825481d148af3a3780e65569a64c1d77d78b2276f9621fbbd75c93a94e40537)

## Architecture

```
User (Browser)
     |
     v
Next.js App (Vercel)
  |-- /api/agent/*        Agent API (trigger CRUD, monitor, payout)
  |-- /api/flight/*       Mock flight status API
  |-- /api/admin/*        Demo: cancel flights
  |-- React UI            Dashboard + Demo Control Panel
     |
     |-- chainsig.js + custom native-fetch provider
     |
     v
NEAR Testnet
  |-- MPC Signer Network (v1.signer-prod.testnet)
  |   Chain Signatures: signs EVM transactions
  |
  v
EVM Chains (Sepolia)
  |-- Ethereum, Base, Arbitrum
  |-- Agent's derived address: 0x8f79694fC0a8A2c0a49bEe02Cd40aCC81d90744F
```

### How It Works

1. The agent derives a deterministic EVM address from its NEAR account (`triggerpay-agent.testnet`) via Chain Signatures — no private key stored.
2. When a trigger condition is met, the agent prepares an EVM transaction and requests a signature from NEAR's MPC network.
3. The MPC network signs the transaction using threshold cryptography — the full key never exists in one place.
4. The signed transaction is broadcast to the target EVM chain.

### Components

| Path | Stack | Purpose |
|------|-------|---------|
| `frontend/` | Next.js 16, TailwindCSS, React Query, chainsig.js, viem | Full-stack app: UI + embedded agent API routes |
| `frontend/src/app/api/agent/` | Next.js API Routes | Trigger CRUD, flight monitoring, Chain Signatures payout |
| `frontend/src/lib/agent/` | TypeScript | Trigger store, activity log, EVM adapter with custom NEAR RPC provider |
| `agent/` | Hono, shade-agent-js | Standalone agent (for Phala Cloud TEE deployment) |
| `contracts/` | Rust, near-sdk | Reference NEAR contract |

### Key Technologies

- **[Shade Agents](https://github.com/nicechute/shade-agent-js)** — Autonomous agents in Phala Cloud TEEs. Code hash attestation proves the agent runs unmodified.
- **[Chain Signatures](https://docs.near.org/chain-signatures)** — NEAR's MPC network signs transactions for any chain. The agent derives a deterministic EVM address and signs payouts without holding private keys.
- **[chainsig.js](https://github.com/nicechute/chainsig.js)** — TypeScript SDK for preparing, signing, and broadcasting cross-chain transactions.
- **Custom native-fetch provider** — Replaces `@near-js/providers` with a `globalThis.fetch`-based implementation for Vercel serverless compatibility.

## Quick Start

### Prerequisites

- Node.js 22+
- NEAR testnet account with credentials

### Run locally

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your NEAR credentials:
#   NEAR_ACCOUNT_ID=your-account.testnet
#   NEAR_PRIVATE_KEY=ed25519:...
#   NEXT_PUBLIC_contractId=your-account.testnet
npm run dev
```

Open `http://localhost:3000`. Create a trigger, then use the Demo Control Panel to cancel a flight and watch the payout execute.

### Deploy to Vercel

```bash
cd frontend
vercel --prod
# Set environment variables in Vercel dashboard:
#   NEAR_ACCOUNT_ID, NEAR_PRIVATE_KEY, NEXT_PUBLIC_contractId
```

### Fund the agent's derived ETH address

The agent derives a deterministic EVM address via Chain Signatures. Fund it with Sepolia ETH:

```bash
# Visit /api/agent/eth-account to see the derived address
# Send Sepolia ETH using a faucet or existing wallet
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEAR_ACCOUNT_ID` | NEAR testnet account | `triggerpay-agent.testnet` |
| `NEAR_PRIVATE_KEY` | Account private key (ed25519) | `ed25519:5zFV...` |
| `NEXT_PUBLIC_contractId` | NEAR account for key derivation | `triggerpay-agent.testnet` |

## Hackathon Tracks

- **NEAR: Open Society — From Finance to the Real World** — Conditional payments for real-world events democratize access to financial protection. Anyone can create a trigger tied to verifiable data.
- **NEAR: BONUS: Only on NEAR** — Shade Agents (TEE) + Chain Signatures (MPC cross-chain signing) are capabilities unique to the NEAR ecosystem. This project cannot be built on any other chain.

## License

MIT
