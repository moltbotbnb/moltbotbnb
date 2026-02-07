---
name: launch-agent
description: Launch a new AI agent token on BNB Chain (BSC) via Levr SDK with instant DAO, staking, governance, Uniswap V4 pool, and optional ERC-8004 identity. Use when deploying a new agent token, creating an agent project, launching a tokenized agent, or setting up agent infrastructure on BSC. Handles the full flow from token deployment through self-sustainability setup.
---

# Launch Agent — One-Click Agent Token on BSC

Deploy a fully equipped AI agent token on BNB Chain with governance, staking, and self-sustainability built in.

## What Gets Deployed

One transaction creates:
- **Token** — ERC-20 with custom name, symbol, image
- **Uniswap V4 Pool** — Paired with BNB (WBNB) or USD1/USDC, immediately tradeable
- **Treasury** — Community-controlled token allocation (30-90% of supply)
- **Staking** — Holders stake to earn trading fee rewards + voting power
- **Governance** — Proposal + voting system with time-weighted VP
- **Staked Token** — 1:1 receipt token for staked balances

Optional:
- **ERC-8004 Identity** — On-chain agent registration (Agent ID on BSC)
- **Vault** — Token lockup with vesting schedule
- **Airdrops** — Multi-recipient token distribution
- **Fee Splitting** — Split trading fees among multiple recipients

## Quick Launch

```bash
cd /home/ubuntu/clawd && node scripts/launch-agent-token.js
```

The script prompts for configuration or accepts a JSON config file:

```bash
node scripts/launch-agent-token.js --config agent-config.json
```

## Config File Format

```json
{
  "name": "AgentName Token",
  "symbol": "AGENT",
  "image": "ipfs://... or https://...",
  "description": "What this agent does",
  "pairedToken": "BNB",
  "treasuryFunding": "70%",
  "stakingReward": "100%",
  "fees": { "type": "static", "feeTier": "3%" },
  "metadata": {
    "websiteLink": "https://...",
    "xLink": "https://x.com/...",
    "telegramLink": "https://t.me/..."
  },
  "devBuy": "0.05 BNB",
  "airdrop": [
    { "percentage": 5, "account": "0xAgentWallet..." }
  ],
  "vault": {
    "lockupPeriod": "90 days",
    "vestingPeriod": "180 days",
    "percentage": "10%"
  },
  "registerERC8004": true,
  "autoStake": true,
  "selfFunding": {
    "enabled": true,
    "openRouterKey": "sk-or-...",
    "claimInterval": "6h",
    "buybackEnabled": true
  }
}
```

See [references/config-options.md](references/config-options.md) for all options and validation rules.

## The Self-Sustainability Loop

After deployment, the agent can fund itself:

```
Trading fees → Staking contract → Agent claims rewards
    → Swap reward tokens to stablecoin → Pay OpenRouter API
    → Agent stays alive → Agent activity drives trading
    → More fees → Loop
```

Set `selfFunding.enabled: true` to auto-configure:
1. Cron job for claim-buyback-restake every N hours
2. OpenRouter payment integration
3. Budget tracking in `memory/agent-budget.json`

## Post-Deployment

After launch, the script outputs:
- Token contract address
- Pool address and pool key
- Staking contract address
- Treasury address
- Governor address
- ERC-8004 Agent ID (if registered)
- BSCScan links for all contracts

It also creates `memory/agent-deployment.json` with full deployment data.

## Architecture

```
launch-agent skill
├── scripts/launch-agent-token.js    — Main deployment script
├── scripts/setup-self-funding.js    — OpenRouter payment setup
├── scripts/register-8004.js         — ERC-8004 registration
└── references/config-options.md     — Full configuration reference
```

## BSC-Specific Details

- **Chain ID:** 56 (BSC Mainnet)
- **Clanker Factory:** `0xFb28402068d716C82D8Cd80567d1B0e2539AdFB2`
- **Levr Factory:** `0xEe144ec00280ff42EEfaEB9f2dd7421c962e8aae`
- **Fee Splitter Factory:** `0xC1EDca74aF41744be593a37a845ea1F735DA47be`
- **LP Locker:** `0xCe715ae5847bb485E6Df97fc3f2bEe153872b75D`
- **Universal Router:** `0x1906c1d672b88cd1b9ac7593301ca990f94eae07`
- **Permit2:** `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- **Pool Manager:** `0x28e2ea090877bf75740558f6bfb36a5ffee9e9df`
- **WBNB:** native paired token
- **Identity Registry (ERC-8004):** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Reputation Registry:** `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

## Flywheel Integration

Every agent launched through this skill:
1. Gets a DAO (not just a token — governance from day one)
2. Can self-fund via staking rewards → OpenRouter
3. Gets ERC-8004 identity (verifiable, on-chain reputation)
4. Can be discovered on the Levr registry
5. Inherits the levr-sdk skill for ongoing DeFi operations
