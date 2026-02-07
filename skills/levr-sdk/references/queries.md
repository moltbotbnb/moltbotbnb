# Levr SDK Query Reference

## getStaticProject(params)

Returns static (cacheable) project data: contract addresses, token info, pool key, fee receivers, fee splitter config.

```typescript
const sp = await getStaticProject({ publicClient, clankerToken: '0x...', userAddress: '0x...' })
```

Returns `StaticProject | null`. Key fields:
- `isRegistered: boolean` — false if token exists but not registered with Levr
- `treasury, governor, staking, stakedToken, forwarder, factory` — contract addresses (only when registered)
- `token: { address, name, symbol, decimals, totalSupply, metadata, imageUrl, originalAdmin, admin, context }`
- `pool?: { poolKey, feeDisplay, numPositions, pairedToken: { address, symbol, decimals, isNative } }`
- `feeReceivers?: Array<{ areYouAnAdmin, admin, recipient, percentage, feePreference? }>`
- `feeSplitter?: { address, isConfigured, isActive, splits: Array<{ receiver, bps }>, totalBps }`

## getProject(params)

Returns dynamic data: treasury stats, staking stats, governance stats, pricing. Requires static project.

```typescript
const project = await getProject({ publicClient, staticProject })
```

Key fields:
- `treasuryStats?: { balance, totalAllocated, utilization, stakingContractBalance, escrowBalance, stakingContractPairedBalance }`
- `stakingStats?: { totalStaked, apr: { token: { raw, percentage }, pairedToken }, outstandingRewards, rewardRates, streamParams }`
- `governanceStats?: { currentCycleId, activeProposalCount: { boost, transfer } }`
- `pricing?: { tokenUsd: string, pairedTokenUsd: string }` — auto-fetched from pool
- `feeSplitter?.pendingFees?: { token, pairedToken }` — dynamic pending fees
- `blockTimestamp?: bigint`

All balance fields use `BalanceResult: { raw: bigint, formatted: string, usd?: string }`.

## getUser(params)

Returns user-specific data: balances, staking, voting power.

```typescript
const user = await getUser({ publicClient, userAddress: '0x...', project })
```

Returns:
- `balances: { token: BalanceResult, pairedToken: BalanceResult, nativeEth?: BalanceResult }`
- `staking: { stakedBalance, allowance, claimableRewards: { staking, pairedToken } }`
- `votingPower: string` — in token-days

## proposals(params)

Returns all proposals for a governance cycle with vote receipts.

```typescript
const result = await proposals({
  publicClient, governorAddress: project.governor, projectId: project.token.address,
  cycleId: project.governanceStats?.currentCycleId,  // Optional, defaults to current
  tokenDecimals: project.token.decimals,
  pricing: project.pricing,
  pageSize: 50,              // Optional, default 50
  userAddress: '0x...',      // Optional, for vote receipts
})
```

Returns `{ proposals: Proposal[], cycleId: bigint, winner: bigint }`.

Each proposal: `{ id, proposalType (0=boost, 1=transfer), proposer, amount, recipient, description, createdAt, votingStartsAt, votingEndsAt, yesVotes, noVotes, totalBalanceVoted, executed, cycleId, meetsQuorum, meetsApproval, state, voteReceipt? }`

## getAirdropStatus(params)

Returns airdrop status with multi-recipient merkle proofs. Called separately from project data.

```typescript
const status = await getAirdropStatus(
  publicClient, project.token.address, project.treasury,
  project.token.decimals, tokenUsdPrice,
  'https://app.com/api/ipfs-search', 'https://app.com/api/ipfs-json'
)
```

Returns: `{ recipients: Array<{ address, allocatedAmount, availableAmount, isAvailable, proof, isTreasury, error? }>, deploymentTimestamp?, lockupDurationHours? } | null`

## fetchVaultData / getVaultStatus

```typescript
const vaultData = await fetchVaultData(publicClient, '0xToken', chainId)
// { allocation: { token, amountTotal, amountClaimed, lockupEndTime, vestingEndTime, admin }, claimable }

const status = getVaultStatus(vaultData, blockTimestamp)
// { status: 'locked'|'vesting'|'vested', statusMessage, descriptionMessage, daysRemaining, claimable, total, claimed }
```

## feeReceivers(params)

```typescript
const receivers = await feeReceivers({ publicClient, clankerToken: '0x...', userAddress: '0x...' })
// Array<{ areYouAnAdmin, admin, recipient, percentage, feePreference? }>
// FeePreference: Both=0, Paired=1, Clanker=2
```

## getUsdPrice(params)

```typescript
const { priceUsd, tokenPerWeth, wethPerUsdc } = await getUsdPrice({
  oraclePublicClient: mainnetClient,  // For WETH/USDC oracle
  quotePublicClient: chainClient,     // For token/WETH quote
  tokenAddress: '0x...', tokenDecimals: 18, quoteFee: 3000,
})
```

## quote.v4.read / quote.v4.bytecode

```typescript
const q = await quote.v4.read({
  publicClient, poolKey, zeroForOne: true, amountIn: parseUnits('100', 18),
  pricing: { pairedTokenUsd: '2500', tokenUsd: '1.5' },  // Optional, for price impact
  tokenAddress: '0x...', currency0Decimals: 18, currency1Decimals: 18,
})
// { amountOut: bigint, gasEstimate, priceImpactBps?, hookFees? }

// For multicall batching:
const bc = quote.v4.bytecode({ publicClient, poolKey, zeroForOne: true, amountIn })
const results = await publicClient.multicall({ contracts: [{ ...bc, functionName: 'quoteExactInputSingle' }] })
```

## Supply Allocation Helper

```typescript
import { calculateAllocationBreakdown } from 'levr-sdk'

const breakdown = calculateAllocationBreakdown({
  treasuryFunding: '30%',
  airdrop: [{ percentage: 10, account: '0x...' }],
  vault: { lockupPeriod: '90 days', vestingPeriod: '30 days', percentage: '10%' },
})
// { treasuryPercentage, airdropPercentage, vaultPercentage, totalAllocatedPercentage, liquidityPercentage }
```
