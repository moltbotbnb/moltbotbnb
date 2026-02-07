/**
 * $MOLT Token Deployment Script
 * Chain: BNB Chain (BSC)
 * Pair: MOLT/USD1
 * 
 * Config confirmed by Levr:
 *   name: "Moltbot"
 *   symbol: "MOLT"
 *   chain: BSC (56)
 *   pairedToken: USD1
 *   fees: dynamic (1% base, 3-5% max)
 *   rewards: 80% → stakers, 20% → moltbot wallet
 *   vault: 10% with lockup
 *   pool: standard (single LP)
 *   devBuy: $200 BNB equivalent
 */

const { createPublicClient, createWalletClient, http } = require('viem');
const { bsc } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const { readFileSync } = require('fs');

// Load wallet
const walletData = JSON.parse(readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf-8'));
const account = privateKeyToAccount(walletData.privateKey);

// RPC — using public BSC RPC, can swap for private later
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(BSC_RPC),
});

const walletClient = createWalletClient({
  chain: bsc,
  transport: http(BSC_RPC),
  account,
});

// USD1 on BSC
const USD1_ADDRESS = '0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d';

// Moltbot wallet (for 20% rewards)
const MOLTBOT_WALLET = walletData.address;

// Deploy config
// Using Levr schema format for deployV4
const deployConfig = {
  name: 'Moltbot',
  symbol: 'MOLT',
  image: 'https://moltbotbnb.github.io/moltbotbnb/assets/pfp.jpg',
  
  metadata: {
    description: 'Autonomous AI agent on BNB Chain. Community-first, real governance, real staking. Evolve or fade. 🦞',
    xLink: 'https://x.com/Moltbotbnb',
    websiteLink: 'https://moltbotbnb.github.io/moltbotbnb',
    telegramLink: 'https://t.me/moltbotbnb',
  },

  // Pair with USD1 stablecoin
  pairedToken: 'USD1',

  // Fees: dynamic 3% (1% base, 3% max with volatility scaling)
  fees: { type: 'dynamic 3%' },

  // Staking: 80% of LP fees → stakers
  stakingReward: '80%',

  // Treasury: 20% of supply
  treasuryFunding: '20%',

  // Vault: 10% of supply, locked 30 days, vests over 30 days
  vault: {
    percentage: '10%',
    lockupPeriod: '30 days',
    vestingPeriod: '30 days',
  },

  // Dev buy: ~$200 in BNB
  devBuy: '200',

  // Remaining 20% of LP fees → moltbot wallet (for API costs, operations)
  // The staking reward is 80%, so the remaining 20% auto-routes to project
};

async function main() {
  console.log('=== $MOLT DEPLOYMENT ===');
  console.log('Chain: BNB Chain (BSC)');
  console.log('Deployer:', account.address);
  console.log('Pair: MOLT/USD1');
  console.log('');

  // Check BNB balance
  const balance = await publicClient.getBalance({ address: account.address });
  const bnbBalance = Number(balance) / 1e18;
  console.log(`BNB Balance: ${bnbBalance} BNB`);

  if (bnbBalance < 0.7) {
    console.error(`\n❌ INSUFFICIENT BNB. Need at least 0.7 BNB for deploy + dev buy + gas.`);
    console.error(`Send BNB to: ${account.address}`);
    process.exit(1);
  }

  console.log('\n✅ Balance sufficient. Ready to deploy.');
  console.log('\nDeploy config:');
  console.log(JSON.stringify(deployConfig, null, 2));
  
  // ----- DEPLOY -----
  // Uncomment below when ready to deploy:
  //
  // const { Clanker } = require('clanker-sdk/v4');
  // const { deployV4 } = require('levr-sdk');
  //
  // const clanker = new Clanker({
  //   publicClient,
  //   wallet: walletClient,
  // });
  //
  // console.log('\n🚀 Deploying $MOLT...');
  // const result = await deployV4({
  //   c: deployConfig,
  //   clanker,
  // });
  //
  // console.log('\n✅ DEPLOYED!');
  // console.log('Token address:', result.address);
  // console.log('TX hash:', result.receipt.transactionHash);
  // console.log('Block:', result.receipt.blockNumber);
  
  console.log('\n⚠️  Deploy is commented out. Uncomment when ready + wallet is funded.');
}

main().catch(console.error);
