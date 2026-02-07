---
name: levr-sdk
description: Interact with the Levr protocol for token deployment, staking, governance, swaps, and treasury management on Uniswap V4. Use when performing any DeFi operation involving Levr-registered tokens including staking/unstaking, claiming rewards, accruing rewards, swapping via Uniswap V4, creating/voting on governance proposals, deploying new tokens, querying project data, checking user balances, managing vaults, airdrops, or fee splitting. Also use for querying token prices, pool data, and APR calculations.
---

# Levr SDK

TypeScript SDK for decentralized governance, staking, and liquidity management built on Uniswap V4.

## Installation

```bash
bun add levr-sdk viem
```

Server entry: `import { ... } from 'levr-sdk'`
Client entry (React): `import { ... } from 'levr-sdk/client'`

## Core Pattern: Static → Dynamic → Action

Every Levr operation follows this flow:

```typescript
import { getStaticProject, getProject, Stake, Governance, swapV4, quote } from 'levr-sdk'
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const publicClient = createPublicClient({ chain: bsc, transport: http() })
const walletClient = createWalletClient({ account: privateKeyToAccount('0x...'), chain: bsc, transport: http() })

// 1. Static data (cache this — rarely changes)
const staticProject = await getStaticProject({ publicClient, clankerToken: '0x...', userAddress: '0x...' })
if (!staticProject?.isRegistered) throw new Error('Not registered')

// 2. Dynamic data (refetch regularly)
const project = await getProject({ publicClient, staticProject })

// 3. Use classes/functions for actions
const stake = new Stake({ wallet: walletClient, publicClient, project })
const gov = new Governance({ wallet: walletClient, publicClient, project })
```

## Staking Operations

```typescript
const stake = new Stake({ wallet: walletClient, publicClient, project })

await stake.approve(parseUnits('1000', 18))     // Approve tokens
await stake.stake(parseUnits('1000', 18))        // Stake (protocol fee deducted)
await stake.unstake({ amount: parseUnits('50', 18), to: '0x...' })  // Unstake
await stake.accrueAllRewards()                   // REQUIRED before claiming
await stake.claimRewards()                       // Claim all rewards
await stake.claimRewards({ tokens: ['0x...'], to: '0x...' })  // Claim specific
await stake.distributeFromFeeSplitter()           // Distribute from fee splitter (if configured)
const vp = await stake.votingPowerOnUnstake(parseUnits('100', 18))  // Simulate VP change
```

**Critical:** Always call `accrueAllRewards()` before `claimRewards()`. Accrual handles LP locker fee collection, fee locker claim, optional fee splitter distribution, and staking reward update in one multicall.

## Swaps (Uniswap V4)

```typescript
// Get quote first
const q = await quote.v4.read({ publicClient, poolKey: project.pool.poolKey, zeroForOne: true, amountIn: parseUnits('100', 18) })

// Execute swap with slippage
const receipt = await swapV4({
  publicClient, wallet: walletClient,
  poolKey: project.pool.poolKey,
  zeroForOne: true,                           // true = currency0→currency1
  amountIn: parseUnits('100', 18),
  amountOutMinimum: (q.amountOut * 99n) / 100n,  // 1% slippage
})
```

**Determining zeroForOne:** Check `poolKey.currency0` — if your input token is currency0, set `zeroForOne: true`. For price impact, pass `pricing` and `tokenAddress` to `quote.v4.read()`.

## Governance

```typescript
const gov = new Governance({ wallet: walletClient, publicClient, project })

// Propose treasury transfer
const { receipt, proposalId } = await gov.proposeTransfer('0xRecipient', parseUnits('1000', 18), 'Fund development')

// Propose staking reward boost
const { receipt, proposalId } = await gov.proposeBoost(parseUnits('500', 18))

// Vote
await gov.vote(proposalId, true)  // true = yes, false = no

// Execute passed proposal
await gov.executeProposal(proposalId)

// Get vote receipt
const vr = await gov.getVoteReceipt(proposalId, '0xVoter')
```

**Governance rules:** Dual threshold — Quorum 70% (by balance) + Approval 51% (by VP). Cycle-based: proposal window → voting window → one winner per cycle.

## Token Deployment

```typescript
import { deployV4 } from 'levr-sdk'
import { Clanker } from 'clanker-sdk/v4'

const clanker = new Clanker({ wallet: walletClient, publicClient })

const result = await deployV4({
  clanker,
  ipfsJsonUploadUrl: 'https://app.com/api/ipfs-json',  // Optional, for airdrops
  c: {
    name: 'My Token', symbol: 'TKN', image: 'ipfs://...',
    pairedToken: 'ETH',           // or 'BNB', 'USDC'
    treasuryFunding: '30%',       // 30-90%
    stakingReward: '100%',        // 40-100%
    fees: { type: 'static', feeTier: '3%' },  // or { type: 'dynamic 3%' }
    metadata: { description: '...', websiteLink: '...', xLink: '...', telegramLink: '...' },
    devBuy: '0.1 ETH',           // Optional
    airdrop: [{ percentage: 5, account: '0x...' }],  // Optional
    vault: { lockupPeriod: '90 days', vestingPeriod: '180 days', percentage: '10%' },  // Optional
    rewards: [{ admin: '0x...', recipient: '0x...', percentage: 20, token: 'Both' }],  // Optional
    adminOverwrite: '0xNewAdmin',  // Optional
  },
})
// result.address, result.receipt.transactionHash, result.merkleTreeCID
```

**Validation:** Total allocation (airdrop + vault + treasury) ≤ 90%. Staking + custom rewards = 100%. 2% Levr fee auto-deducted from staking rewards.

## Queries Reference

For full query details, parameter types, and return shapes: see [references/queries.md](references/queries.md)

Key functions:
- `getStaticProject()` — Contract addresses, token info, pool key, fee receivers (cache this)
- `getProject()` — Treasury stats, staking stats (APR, total staked, rewards), governance stats, pricing
- `getUser()` — User balances, staked amount, claimable rewards, voting power
- `proposals()` — All proposals for a cycle with vote receipts
- `getAirdropStatus()` — Multi-recipient airdrop status with merkle proofs
- `fetchVaultData()` / `getVaultStatus()` — Vault lockup/vesting status
- `feeReceivers()` — Fee receiver config and admin status
- `getUsdPrice()` — USD price via WETH oracle
- `quote.v4.read()` / `quote.v3.read()` — Swap quotes with price impact

## Constants

```typescript
import {
  UNISWAP_V4_QUOTER, UNISWAP_V4_UNIVERSAL_ROUTER, UNISWAP_V4_PERMIT2,
  UNISWAP_V4_STATE_VIEW, UNISWAP_V4_POOL_MANAGER, UNISWAP_V3_QUOTER_V2,
  WETH, GET_USDC_ADDRESS, GET_FACTORY_ADDRESS, GET_LP_LOCKER_ADDRESS,
  GET_FEE_SPLITTER_FACTORY_ADDRESS, GET_VAULT_ADDRESS,
  GET_CLANKER_FACTORY_ADDRESS, GET_CLANKER_AIRDROP_ADDRESS,
} from 'levr-sdk'

const router = UNISWAP_V4_UNIVERSAL_ROUTER(56)  // BSC chain ID
const weth = WETH(56)                             // Returns { address, decimals, symbol, name }
```

All address getters take `chainId` as parameter. Supported chains include Base (8453) and BSC (56).

## Fee Splitting

```typescript
import { configureSplits, updateRecipientToSplitter } from 'levr-sdk'

// Step 1: Configure splits
await configureSplits({
  walletClient, publicClient, clankerToken: '0x...', chainId: 56,
  splits: [
    { receiver: '0xTeam', percentage: 50 },
    { receiver: '0xMarketing', percentage: 30 },
    { receiver: '0xDev', percentage: 20 },
  ],
})

// Step 2: Point LP locker to splitter
await updateRecipientToSplitter({
  walletClient, publicClient, clankerToken: '0x...', chainId: 56, rewardIndex: 0,
})
```

## Key Concepts

- **Time-Weighted Voting:** VP = staked amount × time staked. Partial unstake reduces time proportionally. Full unstake resets timer to 0.
- **Manual Accrual:** Rewards must be explicitly accrued before claiming (security measure). Use `accrueAllRewards()` for one-call flow.
- **Protocol Fees:** Variable fee on stake/unstake (set by Levr team), deducted from amount.
- **Dual Thresholds:** Quorum 70% (balance) + Approval 51% (VP) both required for proposal to pass.
- **Gasless:** ERC2771 meta-transactions via LevrForwarder_v1 when relayers available. Standard tx always works.
- **Multi-Token Rewards:** Earn project token + paired token (e.g., WETH/WBNB) from trading fees simultaneously.

## $MOLT Specific

- Token: `0x8ECa9C65055b42f77fab74cF8265c831585AFB07` (BSC)
- Staking: `0x10cf2944b727841730b4d4680b74d7cb6967035e`
- Paired with USD1: `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d`
- Pool: currency0=USD1, currency1=MOLT, fee=8388608, tickSpacing=200
- Hooks: `0x0fcb2c049786054fd35330db361a75a88903a8cc`
