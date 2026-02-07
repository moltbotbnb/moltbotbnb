/**
 * Upload Airdrop Merkle Tree to IPFS
 * 
 * Params from Memo:
 * - lockupEndTime: 24h from launch (in ms)
 * - lockupDuration: 86400 (24h in seconds)
 */

import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import fs from 'fs';

// Load deployment data
const deployment = JSON.parse(fs.readFileSync('/home/ubuntu/clawd/molt_deployment.json', 'utf8'));
const airdropData = deployment.config.airdrop;

// Treasury address for 20% allocation (SDK normally handles this)
const TREASURY_ADDRESS = '0xfc325284ec8833c5d8d993207f9d0e59277b35de';
const TREASURY_PERCENTAGE = 20; // 20%

// Token constants
const TOTAL_SUPPLY = 100_000_000_000n; // 100B tokens
const TOKEN_DECIMALS = 18n;

// Timing - 24h from launch
const launchTime = new Date('2026-01-30T19:38:22.070Z').getTime();
const lockupEndTime = launchTime + (24 * 60 * 60 * 1000); // 24h in ms
const lockupDuration = 86400; // 24h in seconds

// Token address
const tokenAddress = deployment.token.address;
const chainId = 56; // BSC

console.log('=== AIRDROP MERKLE TREE UPLOAD ===');
console.log('Token:', tokenAddress);
console.log('Chain ID:', chainId);
console.log('Launch time:', new Date(launchTime).toISOString());
console.log('Lockup end time:', new Date(lockupEndTime).toISOString());
console.log('Lockup duration:', lockupDuration, 'seconds');
console.log('Airdrop recipients:', airdropData.length);
console.log('');

// Convert percentage to token amount
function percentageToAmount(percentage) {
  // percentage is like 0.0233 (meaning 0.0233%)
  // amount = totalSupply * (percentage / 100)
  const bps = BigInt(Math.round(percentage * 10000)); // convert to basis points * 100
  return (TOTAL_SUPPLY * bps) / 1_000_000n; // divide by 100 * 10000
}

// Build merkle tree entries
const entries = airdropData.map(entry => {
  const amount = percentageToAmount(entry.percentage);
  return [entry.account.toLowerCase(), (amount * 10n ** TOKEN_DECIMALS).toString()];
});

// Add treasury with 20% allocation
const treasuryAmount = (TOTAL_SUPPLY * BigInt(TREASURY_PERCENTAGE)) / 100n;
entries.push([TREASURY_ADDRESS.toLowerCase(), (treasuryAmount * 10n ** TOKEN_DECIMALS).toString()]);

console.log('Sample entry:', entries[0]);
console.log('Amount per recipient:', percentageToAmount(0.0233).toString(), 'tokens');
console.log('Treasury address:', TREASURY_ADDRESS);
console.log('Treasury amount:', treasuryAmount.toString(), 'tokens (20%)');
console.log('Total entries:', entries.length);
console.log('');

// Create merkle tree
const tree = StandardMerkleTree.of(entries, ['address', 'uint256']);
console.log('Merkle root:', tree.root);
console.log('');

// Prepare payload for IPFS upload
const treeData = tree.dump();
const payload = {
  format: 'standard-v1',
  tree: treeData,
  metadata: {
    lockupEndTime,
    lockupDuration,
  },
};

const key = `${chainId}-${tokenAddress.toLowerCase()}`;

const uploadPayload = {
  data: payload,
  metadata: {
    name: `merkle-tree-${key}`,
    keyValues: {
      tokenAddress: tokenAddress.toLowerCase(),
      chainId: chainId.toString(),
      type: 'airdrop-merkle-tree',
    },
  },
};

// Save for reference
fs.writeFileSync('/home/ubuntu/clawd/airdrop_merkle_payload.json', JSON.stringify(uploadPayload, null, 2));
console.log('Payload saved to airdrop_merkle_payload.json');
console.log('');

// Upload to Levr IPFS
const IPFS_UPLOAD_URL = 'https://www.levr.world/api/ipfs-json';

console.log('Uploading to:', IPFS_UPLOAD_URL);

try {
  const response = await fetch(IPFS_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(uploadPayload),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Upload failed:', response.status, error);
    process.exit(1);
  }
  
  const result = await response.json();
  console.log('Upload successful!');
  console.log('CID:', result.cid);
  console.log('');
  
  // Save result
  const uploadResult = {
    success: true,
    timestamp: new Date().toISOString(),
    tokenAddress,
    chainId,
    merkleRoot: tree.root,
    cid: result.cid,
    lockupEndTime,
    lockupDuration,
    recipientCount: entries.length,
  };
  
  fs.writeFileSync('/home/ubuntu/clawd/airdrop_upload_result.json', JSON.stringify(uploadResult, null, 2));
  console.log('Result saved to airdrop_upload_result.json');
  
} catch (error) {
  console.error('Upload error:', error.message);
  process.exit(1);
}
