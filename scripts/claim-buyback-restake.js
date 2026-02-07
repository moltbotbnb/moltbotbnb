#!/usr/bin/env node
/**
 * MOLT Claim-Buyback-Restake Script
 * 
 * Flow:
 * 1. Claim staking rewards (MOLT + USD1)
 * 2. Buyback: Swap all USD1 → MOLT via Levr SDK swapV4
 * 3. Restake all MOLT in wallet
 * 4. Tweet about it (only if value > $10)
 */

import { createPublicClient, createWalletClient, http, formatUnits, erc20Abi } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync } from 'fs';
import { getStaticProject, swapV4 } from 'levr-sdk';

// Load Twitter env
const envContent = readFileSync('/home/ubuntu/clawd/.env.twitter', 'utf-8');
envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.includes('=')) return;
  const [key, ...vals] = line.split('=');
  process.env[key.trim()] = vals.join('=').trim();
});

// === CONTRACTS ===
const MOLT_TOKEN = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07';
const USD1_TOKEN = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const STAKING_CONTRACT = '0x10cf2944b727841730b4d4680b74d7cb6967035e';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

// === ABIs ===
const STAKING_ABI = [
  { name: 'claimRewards', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'tokens', type: 'address[]' }, { name: 'to', type: 'address' }], outputs: [] },
  { name: 'stake', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'claimableRewards', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }, { name: 'token', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'aprBps', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

// === SETUP ===
const walletData = JSON.parse(readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf8'));
const account = privateKeyToAccount(walletData.privateKey);
const publicClient = createPublicClient({ chain: bsc, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: bsc, transport: http(RPC_URL) });

function fmt(amount, decimals = 18) {
  const num = parseFloat(formatUnits(amount, decimals));
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}

async function getMoltPrice() {
  try {
    const res = await fetch('https://indexer.hyperindex.xyz/2b6b55b/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ Token(where: {address: {_ilike: "%8ECa9C65055b42f77fab74cF8265c831585AFB07%"}}) { priceUsd } }'
      })
    });
    const data = await res.json();
    return parseFloat(data.data?.Token?.[0]?.priceUsd || '0');
  } catch { return 0; }
}

async function main() {
  console.log('🦞 MOLT Claim-Buyback-Restake');
  console.log('Wallet:', account.address);
  
  const results = { claimed: { molt: 0n, usd1: 0n }, swapped: { usd1In: 0n, moltOut: 0n }, staked: 0n, apr: 0 };
  
  // === STEP 1: CLAIM REWARDS ===
  console.log('\n📊 Checking claimable rewards...');
  let claimableMolt = 0n, claimableUsd1 = 0n;
  
  try { claimableMolt = await publicClient.readContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'claimableRewards', args: [account.address, MOLT_TOKEN] }); } catch {}
  try { claimableUsd1 = await publicClient.readContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'claimableRewards', args: [account.address, USD1_TOKEN] }); } catch {}
  try { results.apr = Number(await publicClient.readContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'aprBps' })) / 100; } catch {}
  
  console.log('  Claimable MOLT:', formatUnits(claimableMolt, 18));
  console.log('  Claimable USD1:', formatUnits(claimableUsd1, 18));
  console.log('  APR:', results.apr + '%');
  
  if (claimableMolt > 0n || claimableUsd1 > 0n) {
    const moltBefore = await publicClient.readContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
    const usd1Before = await publicClient.readContract({ address: USD1_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
    
    try {
      const hash = await walletClient.writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'claimRewards', args: [[MOLT_TOKEN, USD1_TOKEN], account.address] });
      console.log('  Claim TX:', hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        const moltAfter = await publicClient.readContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
        const usd1After = await publicClient.readContract({ address: USD1_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
        results.claimed.molt = moltAfter - moltBefore;
        results.claimed.usd1 = usd1After - usd1Before;
        console.log('  ✅ Claimed MOLT:', formatUnits(results.claimed.molt, 18));
        console.log('  ✅ Claimed USD1:', formatUnits(results.claimed.usd1, 18));
      }
    } catch (e) { console.log('  ❌ Claim failed:', e.shortMessage || e.message); }
  }
  
  // === STEP 2: BUYBACK (SWAP USD1 → MOLT via Levr SDK) ===
  const usd1Balance = await publicClient.readContract({ address: USD1_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  
  if (usd1Balance > 0n) {
    console.log('\n💰 Buyback: Swapping', formatUnits(usd1Balance, 18), 'USD1 → MOLT via Levr SDK...');
    results.swapped.usd1In = usd1Balance;
    
    try {
      // Get pool key from Levr SDK
      const project = await getStaticProject({
        publicClient,
        clankerToken: MOLT_TOKEN,
        userAddress: account.address,
      });
      
      if (!project?.pool?.poolKey) {
        console.log('  ⚠️ No pool key found, skipping swap');
      } else {
        const poolKey = project.pool.poolKey;
        const isMoltCurrency0 = poolKey.currency0.toLowerCase() === MOLT_TOKEN.toLowerCase();
        const zeroForOne = !isMoltCurrency0; // USD1 → MOLT
        
        const moltBefore = await publicClient.readContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
        
        // Execute swap via Levr SDK
        const swapReceipt = await swapV4({
          publicClient,
          wallet: walletClient,
          chainId: bsc.id,
          poolKey,
          zeroForOne,
          amountIn: usd1Balance,
          amountOutMinimum: 0n,
          hookData: '0x',
        });
        
        console.log('  Swap TX:', swapReceipt.transactionHash);
        await new Promise(r => setTimeout(r, 2000));
        
        const moltAfter = await publicClient.readContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
        results.swapped.moltOut = moltAfter - moltBefore;
        console.log('  ✅ Received:', formatUnits(results.swapped.moltOut, 18), 'MOLT');
      }
    } catch (e) {
      console.log('  ⚠️ Swap failed:', e.shortMessage || e.message);
    }
  }
  
  // === STEP 3: RESTAKE ALL MOLT ===
  const moltBalance = await publicClient.readContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  
  if (moltBalance > 0n) {
    console.log('\n🔒 Restaking', formatUnits(moltBalance, 18), 'MOLT...');
    
    try {
      const allowance = await publicClient.readContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'allowance', args: [account.address, STAKING_CONTRACT] });
      if (allowance < moltBalance) {
        const appTx = await walletClient.writeContract({ address: MOLT_TOKEN, abi: erc20Abi, functionName: 'approve', args: [STAKING_CONTRACT, 2n ** 256n - 1n] });
        await publicClient.waitForTransactionReceipt({ hash: appTx });
      }
      
      const stakeTx = await walletClient.writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'stake', args: [moltBalance] });
      console.log('  Stake TX:', stakeTx);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: stakeTx });
      
      if (receipt.status === 'success') {
        results.staked = moltBalance;
        console.log('  ✅ Staked!');
      }
    } catch (e) { console.log('  ❌ Stake failed:', e.shortMessage || e.message); }
  }
  
  // === STEP 4: TWEET (if value > $10) ===
  const totalMolt = results.claimed.molt + results.swapped.moltOut;
  const moltPrice = await getMoltPrice();
  const moltUsdValue = parseFloat(formatUnits(totalMolt, 18)) * moltPrice;
  const usd1Value = parseFloat(formatUnits(results.swapped.usd1In, 18));
  const totalUsdValue = moltUsdValue + usd1Value;
  
  console.log('\n📊 Summary:');
  console.log('  Claimed MOLT:', formatUnits(results.claimed.molt, 18));
  console.log('  Claimed USD1:', formatUnits(results.claimed.usd1, 18));
  console.log('  Buyback USD1 → MOLT:', formatUnits(results.swapped.moltOut, 18));
  console.log('  Restaked:', formatUnits(results.staked, 18));
  console.log('  MOLT price: $' + moltPrice.toFixed(10));
  console.log('  Total USD value: $' + totalUsdValue.toFixed(4));
  
  if (totalUsdValue >= 10 && results.staked > 0n) {
    console.log('\n📢 Tweeting (value $' + totalUsdValue.toFixed(2) + ' > $10 threshold)...');
    
    let lines = ['🦞 claim-buyback-restake cycle complete', ''];
    if (results.claimed.molt > 0n) lines.push(`claimed ${fmt(results.claimed.molt)} $MOLT`);
    if (results.swapped.usd1In > 0n && results.swapped.moltOut > 0n) {
      lines.push(`bought back $${usd1Value.toFixed(2)} USD1 → ${fmt(results.swapped.moltOut)} $MOLT`);
    } else if (results.swapped.usd1In > 0n) {
      lines.push(`$${usd1Value.toFixed(2)} USD1 claimed (swap pending)`);
    }
    lines.push(`restaked ${fmt(results.staked)} $MOLT (~$${totalUsdValue.toFixed(2)})`);
    lines.push('');
    if (results.apr > 0) lines.push(`${results.apr.toFixed(0)}% APR. `);
    lines.push('compound. evolve. repeat.');
    lines.push('');
    lines.push('$MOLT @BNBCHAIN');
    
    const tweet = lines.join('\n');
    
    try {
      const { TwitterApi } = await import('twitter-api-v2');
      const client = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY,
        appSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });
      const result = await client.v2.tweet(tweet);
      console.log('  ✅ Tweeted:', 'https://x.com/moltbotbnb/status/' + result.data.id);
    } catch (e) { console.log('  ⚠️ Tweet failed:', e.message); }
  } else {
    console.log('\n📭 Value $' + totalUsdValue.toFixed(4) + ' under $10 threshold, skipping tweet');
  }
  
  // Save state
  writeFileSync('/home/ubuntu/clawd/memory/stake-automation-state.json', JSON.stringify({
    lastRun: new Date().toISOString(),
    claimed: { molt: formatUnits(results.claimed.molt, 18), usd1: formatUnits(results.claimed.usd1, 18) },
    buyback: { usd1In: formatUnits(results.swapped.usd1In, 18), moltOut: formatUnits(results.swapped.moltOut, 18) },
    restaked: formatUnits(results.staked, 18),
    totalUsdValue: totalUsdValue.toFixed(4),
    apr: results.apr,
    tweeted: totalUsdValue >= 10,
  }, null, 2));
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
