/**
 * Test script: Buy, Stake, Unstake, Sell on Levr (BSC)
 * Using the Levr SDK with Uniswap V4 on BNB Chain
 */

import { createPublicClient, createWalletClient, http, formatEther, parseEther, formatUnits, erc20Abi } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

// Dynamic imports for ESM SDK
const sdk = await import('levr-sdk');
const { getStaticProject, getProject, getUser, Stake, swapV4 } = sdk;

// Load wallet
const walletData = JSON.parse(readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf-8'));
const account = privateKeyToAccount(walletData.privateKey);

const BSC_RPC = 'https://bsc-dataseed1.binance.org/';

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(BSC_RPC),
});

const walletClient = createWalletClient({
  chain: bsc,
  transport: http(BSC_RPC),
  account,
});

// Tokens to test with (BSC Levr tokens with liquidity, paired with WBNB)
const TEST_TOKENS = [
  {
    name: 'CZ Tree',
    symbol: 'CZT',
    address: '0x4e4ef74bc78d7dc672f0f54e378f97d19d77db07',
    poolKey: {
      currency0: '0x4e4ef74bc78d7dc672f0f54e378f97d19d77db07',
      currency1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      fee: 8388608,
      tickSpacing: 200,
      hooks: '0xd0c5728911a9f67efe47cf25411c2e052a2fe8cc',
    },
    zeroForOneBuy: false,
  },
  {
    name: 'HigherGlitch',
    symbol: 'HGR',
    address: '0x8b249033f1be8d3ec12ef608e073e11b5c7deb07',
    poolKey: {
      currency0: '0x8b249033f1be8d3ec12ef608e073e11b5c7deb07',
      currency1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      fee: 8388608,
      tickSpacing: 200,
      hooks: '0xd0c5728911a9f67efe47cf25411c2e052a2fe8cc',
    },
    zeroForOneBuy: false,
  },
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getTokenBalance(tokenAddr) {
  return publicClient.readContract({
    address: tokenAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
}

async function doSell(token, amount) {
  if (amount === 0n) {
    log('   No tokens to sell');
    return;
  }
  log(`   Selling ${formatUnits(amount, 18)} ${token.symbol} back to BNB...`);
  const sellReceipt = await swapV4({
    publicClient,
    wallet: walletClient,
    chainId: 56,
    poolKey: token.poolKey,
    zeroForOne: !token.zeroForOneBuy,
    amountIn: amount,
    amountOutMinimum: 0n,
  });
  log(`   ✅ SELL TX: ${sellReceipt.transactionHash}`);
  log(`      Block: ${sellReceipt.blockNumber}, Gas: ${sellReceipt.gasUsed}`);
}

async function main() {
  log('=== LEVR SDK TEST: BUY → STAKE → UNSTAKE → SELL ===');
  log(`Wallet: ${account.address}`);
  log(`Chain: BNB Chain (BSC, chainId: 56)`);

  const bnbBalance = await publicClient.getBalance({ address: account.address });
  log(`BNB Balance: ${formatEther(bnbBalance)} BNB`);

  if (bnbBalance < parseEther('0.005')) {
    log('❌ Not enough BNB. Need at least 0.005 BNB');
    process.exit(1);
  }

  const buyAmountBNB = parseEther('0.005');
  const results = [];

  for (const token of TEST_TOKENS) {
    log(`\n${'='.repeat(60)}`);
    log(`TESTING: ${token.name} (${token.symbol})`);
    log(`${'='.repeat(60)}`);

    try {
      // ====== STEP 1: BUY TOKEN ======
      log('\n--- STEP 1: BUY ---');
      log(`   Buying ${token.symbol} with ${formatEther(buyAmountBNB)} BNB...`);

      const buyReceipt = await swapV4({
        publicClient,
        wallet: walletClient,
        chainId: 56,
        poolKey: token.poolKey,
        zeroForOne: token.zeroForOneBuy,
        amountIn: buyAmountBNB,
        amountOutMinimum: 0n,
      });

      log(`   ✅ BUY TX: ${buyReceipt.transactionHash}`);
      log(`      Block: ${buyReceipt.blockNumber}, Gas: ${buyReceipt.gasUsed}`);

      const tokenBalance = await getTokenBalance(token.address);
      log(`   Token balance: ${formatUnits(tokenBalance, 18)} ${token.symbol}`);

      if (tokenBalance === 0n) {
        log('   ⚠️ Got 0 tokens, skipping...');
        results.push({ token: token.symbol, status: 'BUY_ZERO' });
        continue;
      }

      await sleep(3000);

      // ====== STEP 2: LOAD PROJECT + STAKE ======
      log('\n--- STEP 2: STAKE ---');

      // Step 2a: Get static project data
      log('   Loading project data...');
      const staticProject = await getStaticProject({
        publicClient,
        clankerToken: token.address,
        userAddress: account.address,
      });

      if (!staticProject || !staticProject.isRegistered) {
        log(`   ⚠️ Project not registered or not found. Skipping stake, selling...`);
        await doSell(token, tokenBalance);
        results.push({ token: token.symbol, status: 'NOT_REGISTERED' });
        continue;
      }

      log(`   Staking contract: ${staticProject.staking}`);
      log(`   Token: ${staticProject.token.name} (${staticProject.token.symbol})`);

      // Step 2b: Get full project data
      const projectData = await getProject({
        publicClient,
        staticProject,
      });

      log(`   Total staked: ${projectData.stakingStats?.totalStaked?.formatted || '0'}`);
      log(`   APR: ${projectData.stakingStats?.apr?.token?.percentage || 0}%`);

      // Step 2c: Create Stake instance
      const stakeInstance = new Stake({
        wallet: walletClient,
        publicClient,
        project: {
          staking: staticProject.staking,
          token: staticProject.token,
          stakedToken: staticProject.stakedToken,
          forwarder: staticProject.forwarder,
        },
      });

      const stakeAmount = tokenBalance / 2n; // Stake half
      log(`   Staking ${formatUnits(stakeAmount, 18)} ${token.symbol}...`);

      // Approve
      log('   Approving...');
      await stakeInstance.approve(stakeAmount);
      log('   ✅ Approved');

      await sleep(2000);

      // Stake
      log('   Staking...');
      await stakeInstance.stake(stakeAmount);
      log('   ✅ Staked!');

      // Check user data after staking
      try {
        const userData = await getUser({
          publicClient,
          userAddress: account.address,
          project: projectData,
        });
        log(`   Staked balance: ${userData?.staking?.stakedBalance?.formatted || 'N/A'}`);
        log(`   Remaining balance: ${userData?.balances?.token?.formatted || 'N/A'}`);
      } catch (e) {
        log(`   (Could not fetch user data: ${e.message})`);
      }

      await sleep(3000);

      // ====== STEP 3: UNSTAKE ======
      log('\n--- STEP 3: UNSTAKE ---');
      log(`   Unstaking ${formatUnits(stakeAmount, 18)} ${token.symbol}...`);

      const unstakeResult = await stakeInstance.unstake({ amount: stakeAmount });
      log(`   ✅ Unstaked! TX: ${unstakeResult?.receipt?.transactionHash || 'confirmed'}`);

      await sleep(3000);

      // ====== STEP 4: SELL ALL ======
      log('\n--- STEP 4: SELL ALL ---');
      const finalBalance = await getTokenBalance(token.address);
      await doSell(token, finalBalance);

      // Verify no tokens remaining
      const remaining = await getTokenBalance(token.address);
      log(`   Remaining ${token.symbol}: ${formatUnits(remaining, 18)}`);

      results.push({ token: token.symbol, status: 'SUCCESS' });

    } catch (err) {
      log(`❌ ERROR with ${token.symbol}: ${err.message}`);
      if (err.stack) log(`   Stack: ${err.stack.split('\n').slice(0, 3).join(' | ')}`);
      results.push({ token: token.symbol, status: 'FAILED', error: err.message });

      // Emergency sell
      try {
        const remaining = await getTokenBalance(token.address);
        if (remaining > 0n) {
          log(`   Emergency sell: ${formatUnits(remaining, 18)} ${token.symbol}...`);
          await doSell(token, remaining);
        }
      } catch (e2) {
        log(`   Emergency sell failed: ${e2.message}`);
      }
    }
  }

  // Final summary
  const finalBnb = await publicClient.getBalance({ address: account.address });
  log(`\n${'='.repeat(60)}`);
  log('=== FINAL RESULTS ===');
  log(`Starting BNB: ${formatEther(bnbBalance)}`);
  log(`Ending BNB:   ${formatEther(finalBnb)}`);
  log(`Net cost (gas + slippage): ${formatEther(bnbBalance - finalBnb)} BNB`);
  for (const r of results) {
    log(`  ${r.token}: ${r.status}${r.error ? ' — ' + r.error : ''}`);
  }
  log('=== DONE ===');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
