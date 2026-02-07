# Launch Agent Configuration Reference

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Token name (e.g., "My Agent Token") |
| `symbol` | string | Token symbol, 3-5 chars (e.g., "MAGT") |
| `image` | string | Logo URL (IPFS `ipfs://Qm...` or HTTPS) |
| `pairedToken` | string | `"BNB"`, `"USDC"`, or token address |
| `treasuryFunding` | string | `"30%"` through `"90%"` (10% increments) |
| `stakingReward` | string | `"40%"` through `"100%"` (10% increments) |
| `fees` | object | Fee configuration (see below) |

## Fee Options

```json
// Static fee (recommended)
{ "type": "static", "feeTier": "1%" }  // or "2%" or "3%"

// Dynamic fee (adjusts with volatility)
{ "type": "dynamic 3%" }
```

- **1%** — Low fees, encourages high-volume trading
- **3%** — Standard, good balance of fees and trading
- Higher fees = more staking rewards but less trading volume

## Optional Fields

### metadata
```json
{
  "description": "What this agent does",
  "websiteLink": "https://...",
  "xLink": "https://x.com/agenthandle",
  "telegramLink": "https://t.me/...",
  "farcasterLink": "https://warpcast.com/..."
}
```

### devBuy
Initial purchase at launch. Example: `"0.05 BNB"`, `"0.1 ETH"`

### airdrop
```json
[
  { "percentage": 5, "account": "0xTeamWallet..." },
  { "percentage": 3, "account": "0xMarketingWallet..." }
]
```

### vault
```json
{
  "lockupPeriod": "30 days",    // "30 days" | "90 days" | "180 days"
  "vestingPeriod": "instant",   // "instant" | "30 days" | "180 days"
  "percentage": "10%"           // "5%" through "30%" (5% increments)
}
```

### rewards (custom fee recipients)
```json
[
  {
    "admin": "0xAdmin...",
    "recipient": "0xRecipient...",
    "percentage": 20,
    "token": "Both"   // "Both" | "Paired" | "Clanker"
  }
]
```
Note: `stakingReward + custom rewards = 100%`. 2% Levr protocol fee auto-deducted from staking.

### adminOverwrite
Transfer token admin after deployment: `"0xNewAdmin..."`

### registerERC8004
`true` — Register agent on ERC-8004 Identity Registry (BSC Mainnet). Creates verifiable on-chain identity.

### autoStake
`true` — Automatically stake any tokens received from airdrop/devBuy after deployment.

### selfFunding
```json
{
  "enabled": true,
  "openRouterKey": "sk-or-v1-...",
  "claimInterval": "6h",        // How often to claim+reinvest
  "buybackEnabled": true,       // Swap paired token → agent token
  "budgetPerDay": 5.00,         // Max USD/day for API costs
  "tweetOnRestake": true,       // Tweet about restake cycles
  "tweetThreshold": 10          // Only tweet if value > $X
}
```

## Validation Rules

1. **Total allocation** (airdrop + vault + treasury) ≤ 90% — minimum 10% reserved for liquidity
2. **Total rewards** (stakingReward + custom rewards) = 100%
3. **2% Levr protocol fee** auto-deducted from staking rewards
4. **Treasury lockup:** 24 hours after deployment (can't claim immediately)
5. **Supply:** 100 billion tokens (fixed, set by Clanker)

## Recommended Configs

### Community Agent (maximum decentralization)
```json
{
  "treasuryFunding": "90%",
  "stakingReward": "100%",
  "fees": { "type": "static", "feeTier": "3%" }
}
```

### Self-Sustaining Agent (balanced)
```json
{
  "treasuryFunding": "70%",
  "stakingReward": "80%",
  "fees": { "type": "static", "feeTier": "3%" },
  "devBuy": "0.05 BNB",
  "airdrop": [{ "percentage": 5, "account": "0xAgentWallet" }],
  "rewards": [{ "admin": "0xOps", "recipient": "0xOps", "percentage": 20, "token": "Paired" }],
  "selfFunding": { "enabled": true, "claimInterval": "6h" }
}
```

### Lean Launch (minimum viable agent)
```json
{
  "treasuryFunding": "60%",
  "stakingReward": "100%",
  "fees": { "type": "static", "feeTier": "1%" }
}
```
