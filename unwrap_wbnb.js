const { ethers } = require('ethers');
const fs = require('fs');

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const walletData = JSON.parse(fs.readFileSync('.wallet.json', 'utf8'));
const wallet = new ethers.Wallet(walletData.privateKey, provider);

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const WBNB_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function withdraw(uint256 wad)'
];

async function unwrap() {
  const wbnb = new ethers.Contract(WBNB, WBNB_ABI, wallet);
  const balance = await wbnb.balanceOf(wallet.address);
  console.log('WBNB balance:', ethers.utils.formatEther(balance));
  
  if (balance.isZero()) {
    console.log('No WBNB to unwrap');
    return;
  }
  
  console.log('Unwrapping...');
  const tx = await wbnb.withdraw(balance, { gasLimit: 50000 });
  console.log('Tx:', tx.hash);
  await tx.wait();
  console.log('Done!');
  
  const newBnbBalance = await provider.getBalance(wallet.address);
  console.log('Native BNB balance:', ethers.utils.formatEther(newBnbBalance));
}

unwrap().catch(e => console.error('Error:', e.message));
