# TriggerPay

**Conditional payment infrastructure powered by NEAR Shade Agents and Chain Signatures.**

Set a real-world condition. When it triggers, receive an automatic cross-chain payout — verified in a Trusted Execution Environment, signed via NEAR Chain Signatures.

## Why TriggerPay?

Traditional conditional payments (insurance, escrow, bounties) rely on centralized oracles and single-chain settlement. TriggerPay replaces both:

- **TEE-verified monitoring** — A Shade Agent running in a Trusted Execution Environment monitors real-world APIs. Every check is cryptographically attested via the TEE's code hash, not a custom oracle.
- **Cross-chain payout via Chain Signatures** — When a condition is met, the agent signs an EVM transaction through NEAR's MPC network. Payouts land on Ethereum, Base, or Arbitrum — no bridges, no wrapping.
- **Only on NEAR** — Shade Agents + Chain Signatures is a capability unique to NEAR. No other chain offers TEE-native autonomous agents with native cross-chain signing.

## Demo Flow

1. **Create a trigger** — Enter a flight number, date, and EVM payout address
2. **Agent monitors** — The Shade Agent checks flight status every 15 seconds
3. **Cancel the flight** — Click "Cancel Flight" in the demo control panel
4. **Payout lands** — The agent detects the cancellation, signs an ETH transfer via Chain Signatures, and broadcasts it. The transaction appears on Etherscan within seconds.

## Architecture

```
                    NEAR Testnet
                         |
    +--------------------+--------------------+
    |                                         |
    v                                         v
Shade Agent (TEE)                      MPC Signer Network
  - Hono server                        (Chain Signatures)
  - Flight API polling                        |
  - Trigger store (in-memory)                 |
  - Condition evaluation                      v
  - Payout signing ----request sig----> EVM Transaction
                                              |
    +--------------------+--------------------+
    |                    |                    |
    v                    v                    v
 Ethereum             Base              Arbitrum
 (Sepolia)          (Sepolia)           (Sepolia)
```

### Components

| Component | Stack | Purpose |
|-----------|-------|---------|
| `frontend/` | Next.js 16, TailwindCSS, React Query | Dashboard UI + mock flight API |
| `agent/` | Hono, shade-agent-js, chainsig.js | TEE agent: monitors conditions, signs payouts |
| `contracts/` | Rust, near-sdk | Reference contract (not used in demo flow) |

### Key Technologies

- **[Shade Agents](https://github.com/NearDeFi/shade-agent-template)** — Autonomous agents in Phala Cloud TEEs. Code hash attestation proves the agent runs unmodified.
- **[Chain Signatures](https://docs.near.org/chain-signatures)** — NEAR's MPC network signs transactions for any chain. The agent derives a deterministic EVM address and signs payouts without holding private keys.
- **[chainsig.js](https://github.com/nicechute/chainsig.js)** — TypeScript SDK for preparing, signing, and broadcasting cross-chain transactions.

## Quick Start

### Prerequisites

- Node.js 22+
- NEAR testnet account with credentials

### 1. Start the frontend (includes mock flight API)

```bash
cd frontend
npm install
npm run dev -- -p 3002
```

### 2. Start the agent

```bash
cd agent
npm install
cp .env.development.local.example .env
# Edit .env with your NEAR credentials
npm run dev
```

### 3. Open the dashboard

Navigate to `http://localhost:3002`. Create a trigger, then use the Demo Control Panel to cancel a flight and watch the payout execute.

## Deployment (Phala Cloud)

### 1. Install shade-agent-cli

```bash
npm install -g @neardefi/shade-agent-cli
```

### 2. Build and push the Docker image

```bash
cd agent
npm run docker:build
docker tag triggerpay/agent:latest YOUR_DOCKERHUB/triggerpay-agent:latest
docker push YOUR_DOCKERHUB/triggerpay-agent:latest
```

### 3. Deploy to Phala Cloud

```bash
# Set up your .env.development.local with:
# - NEAR_ACCOUNT_ID, NEAR_SEED_PHRASE
# - NEXT_PUBLIC_contractId=ac-sandbox.YOUR_ACCOUNT.testnet
# - PHALA_API_KEY (from https://cloud.phala.network/dashboard/tokens)

npm run phala:deploy
```

The shade-agent-cli handles:
- Contract deployment for `ac-sandbox.YOUR_ACCOUNT.testnet`
- Code hash registration (API + App)
- TEE environment provisioning

### 4. Fund the agent's derived ETH address

The agent derives a deterministic EVM address via Chain Signatures. Fund it with Sepolia ETH:

```bash
# Get the agent's derived address
curl http://YOUR_PHALA_URL:3001/api/eth-account?chain=Ethereum
```

Send Sepolia ETH to the returned address using a faucet or existing wallet.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEAR_ACCOUNT_ID` | NEAR testnet account | `alice.testnet` |
| `NEAR_SEED_PHRASE` | Account seed phrase | `word1 word2 ...` |
| `NEXT_PUBLIC_contractId` | Shade Agent contract | `ac-proxy.alice.testnet` |
| `FLIGHT_API_URL` | Mock flight API base URL | `http://localhost:3002` |
| `POLL_INTERVAL_MS` | Monitor check interval | `15000` |

## Hackathon Tracks

- **Track 3: Open Society** — Conditional payments for real-world events democratize access to financial protection
- **Track 4: Only on NEAR** — Shade Agents (TEE) + Chain Signatures (MPC cross-chain signing) are unique NEAR capabilities

## License

MIT
