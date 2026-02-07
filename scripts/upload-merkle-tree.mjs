/**
 * Post-deployment merkle tree upload script
 * Fixes the missing IPFS upload from deployment
 */
import { storeMerkleTreeToIPFS, TREASURY_AIRDROP_AMOUNTS as SDK_TREASURY_AMOUNTS } from 'levr-sdk';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import fs from 'fs';

const IPFS_JSON_UPLOAD_URL = 'https://www.levr.world/api/ipfs-json';
const TREASURY_ADDRESS = '0x65E45084B701aaA906dF3596eAdb45BD2ea62C03';
const TOKEN_ADDRESS = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07';
const CHAIN_ID = 56;
const TOTAL_SUPPLY = 100000000000; // 100B tokens
const TOKEN_DECIMALS = 18n;

// Load deployment config
const deployment = JSON.parse(fs.readFileSync('./molt_deployment.json', 'utf8'));
const airdropConfig = deployment.config.airdrop;

// Use SDK treasury amounts (treasuryFunding is already a string like "20%")
const treasuryKey = deployment.config.treasuryFunding.includes('%') 
  ? deployment.config.treasuryFunding 
  : deployment.config.treasuryFunding + '%';
const treasuryAmount = SDK_TREASURY_AMOUNTS[treasuryKey];

console.log('Rebuilding merkle tree from deployment config...');
console.log(`Token: ${TOKEN_ADDRESS}`);
console.log(`Chain: ${CHAIN_ID} (BSC)`);
console.log(`Airdrop recipients: ${airdropConfig.length}`);
console.log(`Treasury allocation: ${deployment.config.treasuryFunding}%`);

// Convert airdrop percentages to amounts (same logic as SDK)
const airdropData = airdropConfig.map(a => ({
  account: a.account,
  amount: Math.round((a.percentage / 100) * TOTAL_SUPPLY),
}));

// Add treasury (always included by SDK)
airdropData.push({
  account: TREASURY_ADDRESS,
  amount: treasuryAmount,
});

console.log(`\nTotal airdrop entries: ${airdropData.length}`);
console.log(`Total airdrop amount: ${airdropData.reduce((acc, a) => acc + a.amount, 0).toLocaleString()} tokens`);

// Convert to merkle tree format (same as SDK)
function toTokenDecimals(amount) {
  return BigInt(amount) * 10n ** TOKEN_DECIMALS;
}

const values = airdropData.map(entry => [
  entry.account.toLowerCase(),
  toTokenDecimals(entry.amount).toString(),
]);

// Create merkle tree using OpenZeppelin's format
const tree = StandardMerkleTree.of(values, ['address', 'uint256']);
const merkleRoot = tree.root;

console.log(`\nMerkle root: ${merkleRoot}`);

// Lockup/vesting from vault config (30 days each = 2592000 seconds)
const lockupDuration = 30 * 24 * 60 * 60; // 30 days in seconds
const lockupEndTime = Math.floor(Date.now() / 1000) + lockupDuration;

console.log('\nUploading to IPFS using SDK...');

try {
  const cid = await storeMerkleTreeToIPFS({
    tokenAddress: TOKEN_ADDRESS,
    chainId: CHAIN_ID,
    treeData: tree.dump(),
    ipfsJsonUploadUrl: IPFS_JSON_UPLOAD_URL,
    lockupEndTime,
    lockupDuration,
  });
  
  console.log(`\n✅ Uploaded successfully!`);
  console.log(`IPFS CID: ${cid}`);
  console.log(`\nThe Levr app should now be able to find airdrop recipients.`);
  
  var result = { cid };
} catch (err) {
  console.error(`Failed to upload: ${err.message}`);
  process.exit(1);
}

// Save result
const uploadResult = {
  timestamp: new Date().toISOString(),
  tokenAddress: TOKEN_ADDRESS,
  chainId: CHAIN_ID,
  merkleRoot,
  cid: result.cid,
  airdropEntries: airdropData.length,
  totalAmount: airdropData.reduce((acc, a) => acc + a.amount, 0),
};

fs.writeFileSync('./merkle-upload-result.json', JSON.stringify(uploadResult, null, 2));
console.log('\nResult saved to merkle-upload-result.json');
