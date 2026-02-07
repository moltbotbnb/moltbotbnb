/**
 * LEVR SDK Test Deployment Script
 * 
 * This script:
 * 1. Creates a new wallet
 * 2. Funds it from the main wallet ($3 BNB + 1 USD1)
 * 3. Deploys a random token using the Levr SDK
 * 4. Does a 1 USD1 dev buy
 * 
 * Taking notes throughout for @x0memo
 */

import { createPublicClient, createWalletClient, http, parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { Clanker } from '../node_modules/levr-sdk/dist/esm/packages/clanker-sdk/src/v4/index.js';
import { deployV4 } from '../node_modules/levr-sdk/dist/esm/src/deploy-v4.js';
import { buildClankerV4 } from '../node_modules/levr-sdk/dist/esm/src/build-clanker-v4.js';
import fs from 'fs';

// USD1 contract on BSC
const USD1_ADDRESS = '0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d';
const USD1_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  }
];

// Load main wallet
const mainWalletPath = '/home/ubuntu/clawd/.wallet.json';
const mainWallet = JSON.parse(fs.readFileSync(mainWalletPath, 'utf8'));

// Initialize clients
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org'),
});

async function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
  
  // Also append to notes file
  const note = data ? `${timestamp}: ${message}\n${JSON.stringify(data, null, 2)}\n\n` : `${timestamp}: ${message}\n\n`;
  fs.appendFileSync('/home/ubuntu/clawd/memory/levr_deploy_notes.md', note);
}

async function main() {
  // Initialize notes file
  fs.writeFileSync('/home/ubuntu/clawd/memory/levr_deploy_notes.md', `# Levr SDK Test Deployment Notes\n\nStarted: ${new Date().toISOString()}\n\n`);
  
  try {
    // =========================================================================
    // STEP 1: Load or create wallet
    // =========================================================================
    await log('📝 STEP 1: Loading/creating wallet...');
    
    let newAccount;
    let newPrivateKey;
    
    // Check if test wallet already exists
    const testWalletPath = '/home/ubuntu/clawd/.wallet-test.json';
    if (fs.existsSync(testWalletPath)) {
      const existingWallet = JSON.parse(fs.readFileSync(testWalletPath, 'utf8'));
      newPrivateKey = existingWallet.privateKey;
      newAccount = privateKeyToAccount(newPrivateKey);
      await log('✅ Using existing test wallet', {
        address: newAccount.address
      });
    } else {
      newPrivateKey = generatePrivateKey();
      newAccount = privateKeyToAccount(newPrivateKey);
      await log('✅ New wallet created', {
        address: newAccount.address,
        privateKey: newPrivateKey
      });
      
      // Save the new wallet for reference
      fs.writeFileSync(testWalletPath, JSON.stringify({
        address: newAccount.address,
        privateKey: newPrivateKey,
        createdAt: new Date().toISOString(),
        purpose: 'Levr SDK test deployment'
      }, null, 2));
      fs.chmodSync(testWalletPath, 0o600);
    }
    
    // =========================================================================
    // STEP 2: Check wallet balances
    // =========================================================================
    await log('📝 STEP 2: Checking wallet balances...');
    
    // Check test wallet balance first
    const testBnbBalance = await publicClient.getBalance({ address: newAccount.address });
    const testUsd1Balance = await publicClient.readContract({
      address: USD1_ADDRESS,
      abi: USD1_ABI,
      functionName: 'balanceOf',
      args: [newAccount.address]
    });
    
    await log('💰 Test wallet balances', {
      address: newAccount.address,
      bnb: formatEther(testBnbBalance),
      usd1: formatUnits(testUsd1Balance, 18)
    });
    
    // Check if test wallet needs funding
    const requiredBnb = parseEther('0.003'); // Lower threshold since we already have some
    const requiredUsd1 = parseUnits('1', 18);
    
    if (testBnbBalance >= requiredBnb && testUsd1Balance >= requiredUsd1) {
      await log('✅ Test wallet already funded, skipping funding step');
    } else {
      // =========================================================================
      // STEP 3: Fund the wallet from main if needed
      // =========================================================================
      await log('📝 STEP 3: Funding wallet from main...');
      
      const mainAccount = privateKeyToAccount(mainWallet.privateKey);
      const mainBnbBalance = await publicClient.getBalance({ address: mainAccount.address });
      
      await log('💰 Main wallet balance', {
        address: mainAccount.address,
        bnb: formatEther(mainBnbBalance)
      });
      
      const mainWalletClient = createWalletClient({
        account: mainAccount,
        chain: bsc,
        transport: http('https://bsc-dataseed.binance.org'),
      });
      
      // Only send BNB if needed
      if (testBnbBalance < requiredBnb) {
        const bnbToSend = parseEther('0.003');
        await log('Sending BNB...', { amount: formatEther(bnbToSend) });
        
        const bnbTxHash = await mainWalletClient.sendTransaction({
          to: newAccount.address,
          value: bnbToSend
        });
        await log('BNB transfer submitted', { txHash: bnbTxHash });
        
        const bnbReceipt = await publicClient.waitForTransactionReceipt({ hash: bnbTxHash });
        await log('✅ BNB transfer confirmed', { status: bnbReceipt.status });
      }
      
      // Only send USD1 if needed
      if (testUsd1Balance < requiredUsd1) {
        const usd1ToSend = parseUnits('1.5', 18);
        await log('Sending USD1...', { amount: formatUnits(usd1ToSend, 18) });
        
        const usd1TxHash = await mainWalletClient.writeContract({
          address: USD1_ADDRESS,
          abi: USD1_ABI,
          functionName: 'transfer',
          args: [newAccount.address, usd1ToSend]
        });
        await log('USD1 transfer submitted', { txHash: usd1TxHash });
        
        const usd1Receipt = await publicClient.waitForTransactionReceipt({ hash: usd1TxHash });
        await log('✅ USD1 transfer confirmed', { status: usd1Receipt.status });
      }
    }
    
    // Verify final balances
    const newBnbBalance = await publicClient.getBalance({ address: newAccount.address });
    const newUsd1Balance = await publicClient.readContract({
      address: USD1_ADDRESS,
      abi: USD1_ABI,
      functionName: 'balanceOf',
      args: [newAccount.address]
    });
    
    await log('💰 Final wallet balances', {
      address: newAccount.address,
      bnb: formatEther(newBnbBalance),
      usd1: formatUnits(newUsd1Balance, 18)
    });
    
    // =========================================================================
    // STEP 4: Prepare deployment config
    // =========================================================================
    await log('📝 STEP 4: Preparing deployment config...');
    
    // Random token metadata
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tokenConfig = {
      name: `Test Token ${randomSuffix}`,
      symbol: `TEST${randomSuffix}`,
      image: 'https://placehold.co/400x400/orange/white?text=TEST', // Placeholder image
      metadata: {
        description: `Moltbot test token deployed via Levr SDK. Random suffix: ${randomSuffix}`
      },
      // Paired with USD1 stablecoin
      pairedToken: 'USD1',
      // Treasury funding - random between 60-90%
      treasuryFunding: ['60%', '70%', '80%', '90%'][Math.floor(Math.random() * 4)],
      // Fee config - random static fee
      fees: {
        type: 'static',
        feeTier: ['1%', '2%', '3%'][Math.floor(Math.random() * 3)]
      },
      // Staking rewards - must be 100% for rewards to sum correctly
      stakingReward: '100%',
      // Dev buy with USD1 - but wait, devBuy needs to be in BNB format
      // For USD1 pair, we need to route through V3
      // Actually looking at the code, devBuy is in native token (BNB)
      // Let me check... the devBuy is ethAmount which gets multiplied by 1e18
      // For stablecoin pairs, it routes through V3 native->stablecoin
      // So we need BNB, not USD1 directly
      devBuy: '0.001 BNB', // Small amount for testing
      // Optional vault config
      vault: {
        lockupPeriod: '30 days',
        vestingPeriod: 'instant',
        percentage: '5%'
      }
    };
    
    await log('📋 Token configuration', tokenConfig);
    
    // =========================================================================
    // STEP 5: Initialize SDK and deploy
    // =========================================================================
    await log('📝 STEP 5: Initializing SDK and deploying...');
    
    const newWalletClient = createWalletClient({
      account: newAccount,
      chain: bsc,
      transport: http('https://bsc-dataseed.binance.org'),
    });
    
    // Initialize Clanker SDK
    const clanker = new Clanker({
      wallet: newWalletClient,
      publicClient
    });
    
    await log('Clanker SDK initialized');
    
    // Deploy using Levr's deployV4
    await log('🚀 Deploying token...');
    
    const deployResult = await deployV4({
      c: tokenConfig,
      clanker,
      ipfsJsonUploadUrl: null // Skip IPFS for this test
    });
    
    await log('🎉 TOKEN DEPLOYED!', {
      tokenAddress: deployResult.address,
      txHash: deployResult.receipt.transactionHash,
      blockNumber: deployResult.receipt.blockNumber.toString(),
      gasUsed: deployResult.receipt.gasUsed.toString()
    });
    
    // =========================================================================
    // SUMMARY
    // =========================================================================
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      newWallet: {
        address: newAccount.address,
        privateKey: newPrivateKey
      },
      token: {
        address: deployResult.address,
        name: tokenConfig.name,
        symbol: tokenConfig.symbol,
        config: tokenConfig
      },
      transaction: {
        hash: deployResult.receipt.transactionHash,
        blockNumber: deployResult.receipt.blockNumber.toString(),
        gasUsed: deployResult.receipt.gasUsed.toString()
      },
      explorerLinks: {
        token: `https://bscscan.com/token/${deployResult.address}`,
        tx: `https://bscscan.com/tx/${deployResult.receipt.transactionHash}`,
        wallet: `https://bscscan.com/address/${newAccount.address}`
      }
    };
    
    await log('📊 DEPLOYMENT SUMMARY', summary);
    
    // Save summary to file
    fs.writeFileSync('/home/ubuntu/clawd/memory/levr_deploy_result.json', JSON.stringify(summary, null, 2));
    
    return summary;
    
  } catch (error) {
    await log('❌ ERROR', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

main()
  .then(result => {
    console.log('\n✅ Deployment completed successfully!');
    console.log(`Token: ${result.token.address}`);
    console.log(`Explorer: ${result.explorerLinks.token}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  });
