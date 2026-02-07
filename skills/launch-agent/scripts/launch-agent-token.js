#!/usr/bin/env node
/**
 * Launch Agent Token on BSC via Levr SDK
 * 
 * Deploys a complete agent infrastructure:
 * - ERC-20 token with Uniswap V4 pool
 * - Treasury, Staking, Governance (instant DAO)
 * - Optional: ERC-8004 identity, vault, airdrops, self-funding
 *
 * Usage:
 *   node launch-agent-token.js --config agent-config.json
 *   node launch-agent-token.js  (interactive prompts)
 */

import { createPublicClient, createWalletClient, http, parseEther, formatUnits, encodeFunctionData, toHex } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { deployV4, ClankerV4 } from 'levr-sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// === CONFIG ===
const RPC_URL = 'https://bsc-dataseed.binance.org/';
const ERC8004_IDENTITY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const ERC8004_REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

// === LOAD WALLET ===
function loadWallet() {
  const walletPath = '/home/ubuntu/clawd/.wallet.json';
  if (!existsSync(walletPath)) throw new Error('No wallet found at ' + walletPath);
  const data = JSON.parse(readFileSync(walletPath, 'utf8'));
  return privateKeyToAccount(data.privateKey);
}

// === LOAD CONFIG ===
function loadConfig() {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf('--config');
  
  if (configIdx !== -1 && args[configIdx + 1]) {
    const configPath = args[configIdx + 1];
    console.log('Loading config from:', configPath);
    return JSON.parse(readFileSync(configPath, 'utf8'));
  }
  
  // Default minimal config for testing
  console.log('No --config provided. Use: node launch-agent-token.js --config agent-config.json');
  console.log('See references/config-options.md for config format.');
  process.exit(1);
}

// === VALIDATE CONFIG ===
function validateConfig(config) {
  const required = ['name', 'symbol', 'pairedToken', 'treasuryFunding', 'stakingReward', 'fees'];
  for (const field of required) {
    if (!config[field]) throw new Error(`Missing required field: ${field}`);
  }
  
  // Validate allocation
  let totalAlloc = parseInt(config.treasuryFunding);
  if (config.airdrop) totalAlloc += config.airdrop.reduce((sum, a) => sum + a.percentage, 0);
  if (config.vault) totalAlloc += parseInt(config.vault.percentage);
  if (totalAlloc > 90) throw new Error(`Total allocation ${totalAlloc}% exceeds 90% (need 10% for liquidity)`);
  
  // Validate rewards
  let totalRewards = parseInt(config.stakingReward);
  if (config.rewards) totalRewards += config.rewards.reduce((sum, r) => sum + r.percentage, 0);
  if (totalRewards !== 100) throw new Error(`Total rewards ${totalRewards}% must equal 100%`);
  
  console.log('✅ Config validated');
  console.log(`   Allocation: ${totalAlloc}% (${100 - totalAlloc}% to liquidity)`);
  console.log(`   Rewards: ${config.stakingReward} to stakers`);
}

// === REGISTER ERC-8004 ===
async function registerERC8004(publicClient, walletClient, account, tokenAddress, config) {
  console.log('\n🆔 Registering ERC-8004 identity...');
  
  const metadata = {
    name: config.name,
    description: config.description || `AI agent on BNB Chain. Launched via Levr SDK.`,
    token: tokenAddress,
    chain: 'bsc',
    links: {
      website: config.metadata?.websiteLink,
      twitter: config.metadata?.xLink,
      telegram: config.metadata?.telegramLink,
    }
  };
  
  const metadataJson = JSON.stringify(metadata);
  const dataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;
  
  const registerAbi = [{
    name: 'register', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'metadataURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  }];
  
  try {
    const hash = await walletClient.writeContract({
      address: ERC8004_IDENTITY,
      abi: registerAbi,
      functionName: 'register',
      args: [dataUri],
    });
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    // Parse agent ID from logs
    let agentId = null;
    for (const log of receipt.logs) {
      if (log.topics[0] === '0xd1a41c5f5b3de909bd0e42e4cd72b48b4d1eb95e6e75555089f24d1b0f424222') {
        agentId = parseInt(log.topics[1], 16);
      }
    }
    
    console.log(`  ✅ Registered! Agent ID: ${agentId}`);
    console.log(`  TX: https://bscscan.com/tx/${hash}`);
    return { agentId, txHash: hash };
  } catch (e) {
    console.log(`  ⚠️ Registration failed: ${e.shortMessage || e.message}`);
    return null;
  }
}

// === MAIN ===
async function main() {
  console.log('🚀 LEVR AGENT LAUNCHER — BNB Chain');
  console.log('===================================\n');
  
  const config = loadConfig();
  validateConfig(config);
  
  const account = loadWallet();
  console.log('Wallet:', account.address);
  
  const publicClient = createPublicClient({ chain: bsc, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: bsc, transport: http(RPC_URL) });
  
  // Check BNB balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('BNB Balance:', formatUnits(balance, 18));
  if (balance < parseEther('0.01')) {
    console.log('⚠️ Low BNB balance. Need at least 0.01 BNB for gas.');
  }
  
  // === DEPLOY TOKEN ===
  console.log('\n📦 Deploying agent token...');
  console.log(`   Name: ${config.name}`);
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Paired: ${config.pairedToken}`);
  console.log(`   Treasury: ${config.treasuryFunding}`);
  console.log(`   Staking Reward: ${config.stakingReward}`);
  console.log(`   Fee: ${config.fees.type} ${config.fees.feeTier || ''}`);
  
  const clanker = new ClankerV4({ wallet: walletClient, publicClient });
  
  const deployConfig = {
    name: config.name,
    symbol: config.symbol,
    image: config.image || '',
    pairedToken: config.pairedToken,
    treasuryFunding: config.treasuryFunding,
    stakingReward: config.stakingReward,
    fees: config.fees,
  };
  
  // Optional fields
  if (config.metadata) deployConfig.metadata = config.metadata;
  if (config.devBuy) deployConfig.devBuy = config.devBuy;
  if (config.airdrop) deployConfig.airdrop = config.airdrop;
  if (config.vault) deployConfig.vault = config.vault;
  if (config.rewards) deployConfig.rewards = config.rewards;
  if (config.adminOverwrite) deployConfig.adminOverwrite = config.adminOverwrite;
  
  try {
    const result = await deployV4({
      clanker,
      c: deployConfig,
    });
    
    console.log('\n✅ TOKEN DEPLOYED!');
    console.log(`   Address: ${result.address}`);
    console.log(`   TX: https://bscscan.com/tx/${result.receipt.transactionHash}`);
    if (result.merkleTreeCID) console.log(`   Merkle CID: ${result.merkleTreeCID}`);
    
    // === Get project data ===
    console.log('\n📊 Fetching project data...');
    const { getStaticProject, getProject } = await import('levr-sdk');
    
    const staticProject = await getStaticProject({
      publicClient,
      clankerToken: result.address,
      userAddress: account.address,
    });
    
    const deployment = {
      timestamp: new Date().toISOString(),
      token: {
        address: result.address,
        name: config.name,
        symbol: config.symbol,
        txHash: result.receipt.transactionHash,
      },
      contracts: {
        treasury: staticProject?.treasury,
        governor: staticProject?.governor,
        staking: staticProject?.staking,
        stakedToken: staticProject?.stakedToken,
      },
      pool: staticProject?.pool ? {
        poolKey: staticProject.pool.poolKey,
        pairedToken: staticProject.pool.pairedToken,
        feeDisplay: staticProject.pool.feeDisplay,
      } : null,
      config,
    };
    
    // === ERC-8004 Registration ===
    if (config.registerERC8004) {
      const erc8004 = await registerERC8004(publicClient, walletClient, account, result.address, config);
      if (erc8004) deployment.erc8004 = erc8004;
    }
    
    // === Auto-Stake ===
    if (config.autoStake && staticProject?.staking) {
      console.log('\n🔒 Auto-staking tokens...');
      const { Stake } = await import('levr-sdk');
      const project = await getProject({ publicClient, staticProject });
      const stake = new Stake({ wallet: walletClient, publicClient, project });
      
      const { erc20Abi } = await import('viem');
      const tokenBalance = await publicClient.readContract({
        address: result.address, abi: erc20Abi, functionName: 'balanceOf', args: [account.address]
      });
      
      if (tokenBalance > 0n) {
        await stake.approve(tokenBalance);
        const stakeReceipt = await stake.stake(tokenBalance);
        console.log(`  ✅ Staked ${formatUnits(tokenBalance, 18)} ${config.symbol}`);
        deployment.autoStaked = formatUnits(tokenBalance, 18);
      }
    }
    
    // === Save Deployment Data ===
    const outputPath = '/home/ubuntu/clawd/memory/agent-deployment.json';
    writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
    console.log(`\n💾 Deployment data saved to ${outputPath}`);
    
    // === Summary ===
    console.log('\n' + '='.repeat(50));
    console.log('🎉 AGENT LAUNCH COMPLETE');
    console.log('='.repeat(50));
    console.log(`Token:      ${result.address}`);
    console.log(`Treasury:   ${deployment.contracts.treasury}`);
    console.log(`Staking:    ${deployment.contracts.staking}`);
    console.log(`Governor:   ${deployment.contracts.governor}`);
    if (deployment.erc8004) console.log(`Agent ID:   ${deployment.erc8004.agentId}`);
    console.log(`BSCScan:    https://bscscan.com/token/${result.address}`);
    console.log('='.repeat(50));
    
    // === Self-Funding Setup Instructions ===
    if (config.selfFunding?.enabled) {
      console.log('\n📡 SELF-FUNDING SETUP');
      console.log('To complete self-funding, run:');
      console.log(`  node scripts/setup-self-funding.js --token ${result.address}`);
      console.log('This will configure:');
      console.log('  - Claim-buyback-restake cron job');
      console.log('  - OpenRouter API payment integration');
      console.log('  - Budget tracking');
    }
    
    return deployment;
    
  } catch (e) {
    console.error('\n❌ Deployment failed:', e.shortMessage || e.message);
    if (e.cause) console.error('Cause:', e.cause.shortMessage || e.cause.message);
    process.exit(1);
  }
}

main().catch(console.error);
