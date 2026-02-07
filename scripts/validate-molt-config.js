/**
 * $MOLT Config Validation Script
 * 
 * Validates config against known levr-sdk 0.5.1 schema constraints
 * without actually importing the SDK (to avoid ESM/CJS issues)
 */

import fs from 'fs';

// Moltbot wallet
const walletData = JSON.parse(fs.readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf8'));
const MOLTBOT_WALLET = walletData.address;

// Known valid schema values from levr-sdk
const VALID_FEE_TIERS = ['1%', '2%', '3%'];
const VALID_STAKING_REWARDS = ['100%', '90%', '80%', '70%', '60%', '50%', '40%'];
const VALID_TREASURY_FUNDING = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%'];
const VALID_PAIRED_TOKENS = ['ETH', 'BNB', 'USDC', 'USDT', 'USD1'];
const VALID_LOCKUP_PERIODS = ['30 days', '90 days', '180 days'];
const VALID_VESTING_PERIODS = ['instant', '30 days', '180 days'];
const VALID_VAULT_PERCENTAGES = ['5%', '10%', '15%', '20%', '25%', '30%'];
const VALID_REWARD_TOKENS = ['Both', 'Paired', 'Token'];

// Airdrop recipients (42 unique addresses @ 0.0233% each)
const AIRDROP_ADDRESSES = [
  '0x8A6A4691DaE1c37A9F4EF6fD98B4249c3b255860',
  '0x23dd5e258bd15b120ac0db87e480769cebcb8c6b',
  '0x09a6b7b62B16232C03c2a4E4aEE21cAE234547C7',
  '0x397c1936145911F5B1E7dfaBb32D426Ff38C94A6',
  '0x6C02C5FCF82d2951Af85C12e8469Ab6f16c58e32',
  '0xce9dbff9bf5ff7150211c5ddaaca7defe2ccc104',
  '0x716c15b5cee829728fc639028dd3f07a527b1a3d',
  '0x8b7962413719955f3cf6b45f5b02e4de42ab1fe3',
  '0x4f856fd886BA5aAEc539E9046d2104152b9936AB',
  '0x26080aee84ea856d98d376764a2d0bd393c769f6',
  '0x70661bd0Cd86045eB147470cD7464cF85A793a61',
  '0x33d7eaca2D1a4b77C9CB2dd6e56587fA6e3747bd',
  '0x15cF5690786Eaa455F870A582FC234f5029A19BB',
  '0x119ff5bf67155d29411d8beb0afe09300f89a32b',
  '0xc595bbb153b36f378f275ab08b9ee233212b54d8',
  '0xaC8EbEb5F3a0187d49e85d304547609387512EB2',
  '0xd55254553f873f2f6b615b28b2eb89103f6a5bde',
  '0xcf2d9ae679ee925368a6aab54bba70fd35e1a83f',
  '0x842A0F132E303210B72960f194605aD22f2336F2',
  '0xaC71bc782fff0034675E08130f3b9cC9e605d022',
  '0x4110be16071686ab15d22f72c81b0dc4fb8dd15c',
  '0x9d2CA1095a3068e58b9048869B052b78D4698e7A',
  '0xD7E7fd33497A6d6312488874C6E5FD8CeC18DdcA',
  '0x366C509De90399CEf0D62f17aE238E14DE7422ef',
  '0x357b184ee545fe02858027dfec9dd9e097a435d8',
  '0xa0a419940bca36dff0af5d75d2fd6c401640fb99',
  '0x6c1452d04a05f2280521ccf52ea90b6dc32525df',
  '0x5814b331922f2055f959747203041cec960d238b',
  '0xCbFECd95458b950aC92e4Dd6E18CBd6e711DF0f5',
  '0x1F4ac228555D21BEfD6bF0f21111d13092A2BC7d',
  '0x24CdD1615c5b40A5692f94dBA40eC653b3309727',
  '0x15aaa0bcc49bf440cb07f0c74e78f87e55a85b80',
  '0x157436fb12d39091de727c8462ae3e9326718233',
  '0xEE11D85440a16ca3CDbd9e6b30Ba89822231B225',
  '0xfa435F118509011A49BEd60F939AB6f2280af618',
  '0x40A86D04f51f1a63bf0559874C5C034E4DD9cD4F',
  '0xC20031b1766910E5DB77500f4975a61aEfdDBAd6',
  '0x47C0658A5651c1d59FC2979C143944B4C43A655a',
  '0x84458f60cc37387b6c7adb4977df1fb285d69182',
  '0x4772c0E357bB4a78399dc58F651b7649BA6A503d',
  '0x8BBb25A60d0Af4d168c3f365DEC206afe3cF04b0',
  '0xc80b3a05a0eabe213943a52eaa41077579dd5e23'
];

// The deploy config
const deployConfig = {
  name: 'Moltbot',
  symbol: 'MOLT',
  image: 'https://moltbotbnb.github.io/moltbotbnb/assets/pfp.jpg',
  
  metadata: {
    description: 'Autonomous AI agent on BNB Chain. The evolution is here. 🦞',
    xLink: 'https://x.com/moltbotbnb',
    websiteLink: 'https://moltbotbnb.github.io/moltbotbnb/',
    telegramLink: 'https://t.me/moltbotbnb',
  },

  pairedToken: 'USD1',

  fees: { 
    type: 'static',
    feeTier: '2%'
  },

  stakingReward: '80%',
  treasuryFunding: '20%',
  devBuy: '0.23',

  rewards: [
    {
      admin: MOLTBOT_WALLET,
      recipient: MOLTBOT_WALLET,
      percentage: 20,
      token: 'Both'
    }
  ],

  vault: {
    percentage: '10%',
    recipient: MOLTBOT_WALLET,
    lockupPeriod: '30 days',
    vestingPeriod: '30 days'
  },

  airdrop: AIRDROP_ADDRESSES.map(address => ({
    recipient: address,
    percentage: 0.0233
  }))
};

// Validation functions
function isValidAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function validateConfig(config) {
  const errors = [];
  const warnings = [];
  
  console.log('🔍 Validating $MOLT Deploy Config...\n');
  
  // Basic fields
  if (!config.name || typeof config.name !== 'string') {
    errors.push('❌ name: required string');
  } else {
    console.log(`✅ name: "${config.name}"`);
  }
  
  if (!config.symbol || typeof config.symbol !== 'string') {
    errors.push('❌ symbol: required string');
  } else {
    console.log(`✅ symbol: "${config.symbol}"`);
  }
  
  if (!config.image || typeof config.image !== 'string') {
    errors.push('❌ image: required string URL');
  } else {
    console.log(`✅ image: "${config.image}"`);
  }
  
  // Paired token
  if (!VALID_PAIRED_TOKENS.includes(config.pairedToken)) {
    errors.push(`❌ pairedToken: "${config.pairedToken}" not in ${VALID_PAIRED_TOKENS}`);
  } else {
    console.log(`✅ pairedToken: "${config.pairedToken}"`);
  }
  
  // Fees
  if (!config.fees || config.fees.type !== 'static') {
    warnings.push('⚠️ fees.type: only "static" tested');
  }
  if (!VALID_FEE_TIERS.includes(config.fees?.feeTier)) {
    errors.push(`❌ fees.feeTier: "${config.fees?.feeTier}" not in ${VALID_FEE_TIERS}`);
  } else {
    console.log(`✅ fees.feeTier: "${config.fees.feeTier}"`);
  }
  
  // Staking reward
  if (!VALID_STAKING_REWARDS.includes(config.stakingReward)) {
    errors.push(`❌ stakingReward: "${config.stakingReward}" not in ${VALID_STAKING_REWARDS}`);
  } else {
    console.log(`✅ stakingReward: "${config.stakingReward}"`);
  }
  
  // Treasury funding
  if (!VALID_TREASURY_FUNDING.includes(config.treasuryFunding)) {
    errors.push(`❌ treasuryFunding: "${config.treasuryFunding}" not in ${VALID_TREASURY_FUNDING}`);
  } else {
    console.log(`✅ treasuryFunding: "${config.treasuryFunding}"`);
  }
  
  // Dev buy
  if (config.devBuy) {
    const devBuyNum = parseFloat(config.devBuy);
    if (isNaN(devBuyNum) || devBuyNum < 0) {
      errors.push(`❌ devBuy: "${config.devBuy}" must be a positive number`);
    } else {
      console.log(`✅ devBuy: "${config.devBuy}" BNB`);
    }
  }
  
  // Rewards
  if (config.rewards && Array.isArray(config.rewards)) {
    let rewardsTotal = 0;
    config.rewards.forEach((r, i) => {
      if (!isValidAddress(r.admin)) {
        errors.push(`❌ rewards[${i}].admin: invalid address`);
      }
      if (!isValidAddress(r.recipient)) {
        errors.push(`❌ rewards[${i}].recipient: invalid address`);
      }
      if (typeof r.percentage !== 'number' || r.percentage < 0 || r.percentage > 100) {
        errors.push(`❌ rewards[${i}].percentage: must be 0-100`);
      }
      if (!VALID_REWARD_TOKENS.includes(r.token)) {
        errors.push(`❌ rewards[${i}].token: "${r.token}" not in ${VALID_REWARD_TOKENS}`);
      }
      rewardsTotal += r.percentage || 0;
    });
    
    // Check rewards + staking = 100%
    const stakingNum = parseInt(config.stakingReward);
    if (stakingNum + rewardsTotal !== 100) {
      errors.push(`❌ stakingReward (${stakingNum}%) + rewards (${rewardsTotal}%) must = 100%`);
    } else {
      console.log(`✅ rewards: ${config.rewards.length} recipient(s), ${rewardsTotal}% total`);
    }
  }
  
  // Vault
  if (config.vault) {
    if (!VALID_VAULT_PERCENTAGES.includes(config.vault.percentage)) {
      errors.push(`❌ vault.percentage: "${config.vault.percentage}" not in ${VALID_VAULT_PERCENTAGES}`);
    }
    if (!isValidAddress(config.vault.recipient)) {
      errors.push(`❌ vault.recipient: invalid address`);
    }
    if (!VALID_LOCKUP_PERIODS.includes(config.vault.lockupPeriod)) {
      errors.push(`❌ vault.lockupPeriod: "${config.vault.lockupPeriod}" not in ${VALID_LOCKUP_PERIODS}`);
    }
    if (!VALID_VESTING_PERIODS.includes(config.vault.vestingPeriod)) {
      errors.push(`❌ vault.vestingPeriod: "${config.vault.vestingPeriod}" not in ${VALID_VESTING_PERIODS}`);
    }
    
    if (errors.filter(e => e.includes('vault')).length === 0) {
      console.log(`✅ vault: ${config.vault.percentage} (${config.vault.lockupPeriod} lock, ${config.vault.vestingPeriod} vest)`);
    }
  }
  
  // Airdrop
  if (config.airdrop && Array.isArray(config.airdrop)) {
    let airdropTotal = 0;
    let invalidAddresses = 0;
    
    config.airdrop.forEach((a, i) => {
      if (!isValidAddress(a.recipient)) {
        invalidAddresses++;
        errors.push(`❌ airdrop[${i}].recipient: "${a.recipient}" invalid address`);
      }
      if (typeof a.percentage !== 'number' || a.percentage < 0) {
        errors.push(`❌ airdrop[${i}].percentage: must be a positive number`);
      }
      airdropTotal += a.percentage || 0;
    });
    
    // Check for duplicates
    const uniqueAddresses = new Set(config.airdrop.map(a => a.recipient.toLowerCase()));
    if (uniqueAddresses.size !== config.airdrop.length) {
      warnings.push(`⚠️ airdrop: ${config.airdrop.length - uniqueAddresses.size} duplicate address(es)`);
    }
    
    if (invalidAddresses === 0) {
      console.log(`✅ airdrop: ${config.airdrop.length} addresses, ${airdropTotal.toFixed(4)}% total`);
    }
  }
  
  // Metadata
  if (config.metadata) {
    console.log(`✅ metadata: description, xLink, websiteLink, telegramLink present`);
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (errors.length > 0) {
    console.log('\n❌ VALIDATION FAILED\n');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\n✅ VALIDATION PASSED\n');
  }
  
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log(w));
  }
  
  // Summary
  console.log('\n📊 CONFIG SUMMARY:');
  console.log(`   Token: ${config.name} (${config.symbol})`);
  console.log(`   Pair: ${config.symbol}/${config.pairedToken}`);
  console.log(`   Fee: ${config.fees.feeTier} static`);
  console.log(`   Staking: ${config.stakingReward}`);
  console.log(`   Admin rewards: ${config.rewards?.[0]?.percentage || 0}%`);
  console.log(`   Treasury: ${config.treasuryFunding}`);
  console.log(`   Vault: ${config.vault?.percentage || 'none'}`);
  console.log(`   Airdrop: ${config.airdrop?.length || 0} addresses`);
  console.log(`   Dev buy: ${config.devBuy || 'none'} BNB`);
  
  return { valid: errors.length === 0, errors, warnings };
}

// Run validation
const result = validateConfig(deployConfig);

// Output full config as JSON
console.log('\n📋 FULL CONFIG JSON:\n');
console.log(JSON.stringify(deployConfig, null, 2));

process.exit(result.valid ? 0 : 1);
