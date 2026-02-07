/**
 * Cleanup: Unstake all staked tokens and sell everything
 */
import { createPublicClient, createWalletClient, http, formatEther, formatUnits, erc20Abi } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const sdk = await import('levr-sdk');
const { getStaticProject, getProject, getUser, Stake, swapV4 } = sdk;

const walletData = JSON.parse(readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf-8'));
const account = privateKeyToAccount(walletData.privateKey);
const BSC_RPC = 'https://bsc-dataseed1.binance.org/';

const publicClient = createPublicClient({ chain: bsc, transport: http(BSC_RPC) });
const walletClient = createWalletClient({ chain: bsc, transport: http(BSC_RPC), account });

const TOKENS = [
  {
    name: 'CZ Tree', symbol: 'CZT',
    address: '0x4e4ef74bc78d7dc672f0f54e378f97d19d77db07',
    poolKey: {
      currency0: '0x4e4ef74bc78d7dc672f0f54e378f97d19d77db07',
      currency1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      fee: 8388608, tickSpacing: 200,
      hooks: '0xd0c5728911a9f67efe47cf25411c2e052a2fe8cc',
    },
    zeroForOneBuy: false,
  },
  {
    name: 'HigherGlitch', symbol: 'HGR',
    address: '0x8b249033f1be8d3ec12ef608e073e11b5c7deb07',
    poolKey: {
      currency0: '0x8b249033f1be8d3ec12ef608e073e11b5c7deb07',
      currency1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      fee: 8388608, tickSpacing: 200,
      hooks: '0xd0c5728911a9f67efe47cf25411c2e052a2fe8cc',
    },
    zeroForOneBuy: false,
  },
];

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Read the staking contract for user's actual staked balance
const LevrStaking_v1 = (await import('levr-sdk')).LevrStaking_v1;

async function main() {
  log('=== CLEANUP: UNSTAKE + SELL ===');
  
  for (const token of TOKENS) {
    log(`\n--- ${token.symbol} ---`);
    
    try {
      // Load project
      const staticProject = await getStaticProject({
        publicClient,
        clankerToken: token.address,
        userAddress: account.address,
      });
      
      if (!staticProject?.isRegistered) {
        log('  Not registered, skip');
        continue;
      }

      const projectData = await getProject({ publicClient, staticProject });
      
      // Get user data to find actual staked balance
      const userData = await getUser({
        publicClient,
        userAddress: account.address,
        project: projectData,
      });
      
      const stakedRaw = userData?.staking?.stakedBalance?.raw || 0n;
      const tokenBalanceRaw = userData?.balances?.token?.raw || 0n;
      
      log(`  Staked: ${formatUnits(stakedRaw, 18)} ${token.symbol}`);
      log(`  Wallet: ${formatUnits(tokenBalanceRaw, 18)} ${token.symbol}`);
      
      // Unstake if anything is staked
      if (stakedRaw > 0n) {
        log(`  Unstaking ${formatUnits(stakedRaw, 18)}...`);
        
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
        
        const result = await stakeInstance.unstake({ amount: stakedRaw });
        log(`  ✅ Unstaked! TX: ${result?.receipt?.transactionHash || 'done'}`);
        await sleep(3000);
      }
      
      // Now sell everything
      const finalBalance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      });
      
      if (finalBalance > 0n) {
        log(`  Selling ${formatUnits(finalBalance, 18)} ${token.symbol}...`);
        const receipt = await swapV4({
          publicClient,
          wallet: walletClient,
          chainId: 56,
          poolKey: token.poolKey,
          zeroForOne: !token.zeroForOneBuy,
          amountIn: finalBalance,
          amountOutMinimum: 0n,
        });
        log(`  ✅ Sold! TX: ${receipt.transactionHash}`);
      } else {
        log('  No tokens to sell');
      }
      
    } catch (err) {
      log(`  ❌ Error: ${err.message}`);
    }
  }
  
  const finalBnb = await publicClient.getBalance({ address: account.address });
  log(`\nFinal BNB balance: ${formatEther(finalBnb)}`);
}

main().catch(console.error);
