# Levr SDK Notes

## How It Works
Levr factory deploys everything in ONE transaction:
- Token with custom name/symbol/image
- Treasury (community-controlled allocation)
- Staking contracts (holders stake for rewards + voting)
- Governance system
- Uniswap V4 liquidity pool

**No custom contract deployment needed.**

## What You Need
- Gas fees only (minimal BNB)
- Optional: Dev buy (BNB to buy tokens at launch price)

## Configuration Options

### Treasury Funding (% of supply to community)
- 90% = maximum community control
- 70% = balanced
- 60% = more tokens in circulation

### Staking Rewards (% of trading fees to stakers)
- 100% = all fees to stakers (most attractive)
- 75% = most to stakers
- 50% = half to stakers

### Fees (on every trade)
- 1% = low fees, more trading
- 3% = standard (recommended)
- 5% = high fees, more rewards
- Dynamic option: adjusts with volatility

### Dev Buy (optional)
Use BNB to buy tokens at launch for yourself

## After Deployment
- Day 1 (24h): Treasury locked, but pool is live, staking active, governance ready
- After 24h: Treasury claims tokens, governance can create proposals

## SDK
- Server: `import { getProject, Stake, Governance } from 'levr-sdk'`
- Client: `import { LevrProvider, useStake } from 'levr-sdk/client'`

## Key Concepts
- **Manual reward accrual**: Must accrue before claiming
- **Time-weighted voting**: Power = staked amount × time staked
- **Protocol fees**: Small fee on stake/unstake operations

## Docs
https://www.levr.world/api/docs
