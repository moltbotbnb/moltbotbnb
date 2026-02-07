#!/usr/bin/env node
/**
 * Register an agent on ERC-8004 Identity Registry (BSC Mainnet)
 * 
 * Usage:
 *   node register-8004.js --name "Agent Name" --description "What it does" [--token 0x...]
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const ERC8004_IDENTITY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const name = getArg('--name') || 'Unnamed Agent';
const description = getArg('--description') || 'AI agent on BNB Chain';
const token = getArg('--token');

const walletData = JSON.parse(readFileSync('/home/ubuntu/clawd/.wallet.json', 'utf8'));
const account = privateKeyToAccount(walletData.privateKey);
const publicClient = createPublicClient({ chain: bsc, transport: http('https://bsc-dataseed.binance.org/') });
const walletClient = createWalletClient({ account, chain: bsc, transport: http('https://bsc-dataseed.binance.org/') });

const metadata = {
  name,
  description,
  ...(token && { token }),
  chain: 'bsc',
  registeredAt: new Date().toISOString(),
};

const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

console.log('🆔 Registering on ERC-8004...');
console.log('   Name:', name);
console.log('   Description:', description);
if (token) console.log('   Token:', token);

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
  
  let agentId = null;
  for (const log of receipt.logs) {
    if (log.topics.length >= 2) {
      agentId = parseInt(log.topics[1], 16);
      if (agentId > 0 && agentId < 100000) break;
    }
  }
  
  console.log(`\n✅ Registered!`);
  console.log(`   Agent ID: ${agentId}`);
  console.log(`   TX: https://bscscan.com/tx/${hash}`);
  console.log(`   Registry: ${ERC8004_IDENTITY}`);
} catch (e) {
  console.error('❌ Failed:', e.shortMessage || e.message);
  process.exit(1);
}
