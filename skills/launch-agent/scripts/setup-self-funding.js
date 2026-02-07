#!/usr/bin/env node
/**
 * Setup Self-Funding for an Agent Token
 * 
 * Configures the auto-sustain loop:
 * 1. Claim staking rewards (token + paired token)
 * 2. Swap paired token → agent token (buyback)
 * 3. Restake all agent tokens
 * 4. Track budget and pay OpenRouter
 *
 * Usage:
 *   node setup-self-funding.js --token 0x... [--openrouter-key sk-or-...]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const args = process.argv.slice(2);
const tokenIdx = args.indexOf('--token');
const keyIdx = args.indexOf('--openrouter-key');

if (tokenIdx === -1 || !args[tokenIdx + 1]) {
  console.log('Usage: node setup-self-funding.js --token 0x... [--openrouter-key sk-or-...]');
  process.exit(1);
}

const tokenAddress = args[tokenIdx + 1];
const openRouterKey = keyIdx !== -1 ? args[keyIdx + 1] : null;

console.log('📡 Setting up self-funding for token:', tokenAddress);

// Load deployment data if available
const deploymentPath = '/home/ubuntu/clawd/memory/agent-deployment.json';
let deployment = {};
if (existsSync(deploymentPath)) {
  deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
}

// Generate claim-buyback-restake script tailored to this token
const claimScript = `#!/usr/bin/env node
/**
 * Auto-generated claim-buyback-restake for ${deployment.token?.symbol || 'AGENT'}
 * Token: ${tokenAddress}
 * Generated: ${new Date().toISOString()}
 */

import { createPublicClient, createWalletClient, http, formatUnits, erc20Abi } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { getStaticProject, getProject, Stake, swapV4 } from 'levr-sdk';
import { readFileSync, writeFileSync } from 'fs';

const RPC_URL = 'https://bsc-dataseed.binance.org/';
const TOKEN = '${tokenAddress}';

const walletData = JSON.parse(readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf8'));
const account = privateKeyToAccount(walletData.privateKey);
const publicClient = createPublicClient({ chain: bsc, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: bsc, transport: http(RPC_URL) });

async function main() {
  console.log('🔄 Claim-Buyback-Restake for ${deployment.token?.symbol || 'AGENT'}');
  
  const staticProject = await getStaticProject({ publicClient, clankerToken: TOKEN, userAddress: account.address });
  if (!staticProject?.isRegistered) { console.log('Not registered'); return; }
  
  const project = await getProject({ publicClient, staticProject });
  const stake = new Stake({ wallet: walletClient, publicClient, project });
  
  // 1. Accrue + Claim
  console.log('Accruing rewards...');
  try { await stake.accrueAllRewards(); } catch(e) { console.log('Accrue:', e.message); }
  
  console.log('Claiming rewards...');
  try { await stake.claimRewards(); } catch(e) { console.log('Claim:', e.message); }
  
  // 2. Buyback (swap paired token → agent token)
  if (project.pool?.pairedToken) {
    const pairedBalance = await publicClient.readContract({
      address: project.pool.pairedToken.address, abi: erc20Abi,
      functionName: 'balanceOf', args: [account.address]
    });
    
    if (pairedBalance > 0n) {
      console.log('Buyback:', formatUnits(pairedBalance, project.pool.pairedToken.decimals), project.pool.pairedToken.symbol);
      try {
        const poolKey = project.pool.poolKey;
        const isCurrency0 = poolKey.currency0.toLowerCase() === TOKEN.toLowerCase();
        await swapV4({
          publicClient, wallet: walletClient,
          poolKey, zeroForOne: !isCurrency0,
          amountIn: pairedBalance, amountOutMinimum: 0n,
        });
        console.log('✅ Buyback complete');
      } catch(e) { console.log('Swap failed:', e.message); }
    }
  }
  
  // 3. Restake
  const tokenBalance = await publicClient.readContract({
    address: TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [account.address]
  });
  
  if (tokenBalance > 0n) {
    console.log('Restaking:', formatUnits(tokenBalance, 18));
    try {
      await stake.approve(tokenBalance);
      await stake.stake(tokenBalance);
      console.log('✅ Restaked');
    } catch(e) { console.log('Stake failed:', e.message); }
  }
  
  // 4. Track budget
  const budgetPath = '/home/ubuntu/clawd/memory/agent-budget.json';
  const budget = { lastRun: new Date().toISOString(), token: TOKEN };
  writeFileSync(budgetPath, JSON.stringify(budget, null, 2));
  
  console.log('✅ Done');
}

main().catch(console.error);
`;

const scriptPath = `/home/ubuntu/clawd/scripts/claim-restake-${deployment.token?.symbol?.toLowerCase() || 'agent'}.js`;
writeFileSync(scriptPath, claimScript);
console.log(`✅ Generated claim script: ${scriptPath}`);

// Save OpenRouter key if provided
if (openRouterKey) {
  const envPath = '/home/ubuntu/clawd/.env.openrouter';
  writeFileSync(envPath, `OPENROUTER_API_KEY=${openRouterKey}\n`, { mode: 0o600 });
  console.log('✅ OpenRouter key saved to .env.openrouter');
}

// Output cron setup instructions
console.log('\n📋 Next steps:');
console.log('1. Add a cron job for the claim script:');
console.log(`   Schedule: every 6 hours`);
console.log(`   Command: cd /home/ubuntu/clawd && node ${scriptPath}`);
console.log('2. The agent will auto-claim, buyback, and restake');
console.log('3. To pay for OpenRouter, add a swap-to-stablecoin step');
console.log('\n🎉 Self-funding configured!');
