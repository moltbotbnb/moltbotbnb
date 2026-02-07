const { ethers } = require('ethers');
const fs = require('fs');

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const walletData = JSON.parse(fs.readFileSync('.wallet.json', 'utf8'));
const wallet = new ethers.Wallet(walletData.privateKey, provider);

const USD1 = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const PANCAKE_ROUTER = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'; // PancakeSwap V3 SwapRouter

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

async function swap() {
  console.log('Wallet:', wallet.address);
  
  const usd1Contract = new ethers.Contract(USD1, ERC20_ABI, wallet);
  const balance = await usd1Contract.balanceOf(wallet.address);
  const decimals = await usd1Contract.decimals();
  console.log('USD1 balance:', ethers.utils.formatUnits(balance, decimals));
  
  if (balance.isZero()) {
    console.log('No USD1 to swap');
    return;
  }
  
  // Check and approve if needed
  const allowance = await usd1Contract.allowance(wallet.address, PANCAKE_ROUTER);
  if (allowance.lt(balance)) {
    console.log('Approving router...');
    const approveTx = await usd1Contract.approve(PANCAKE_ROUTER, ethers.constants.MaxUint256);
    console.log('Approve tx:', approveTx.hash);
    await approveTx.wait();
    console.log('Approved!');
  }
  
  // Swap USD1 -> WBNB via V3
  const router = new ethers.Contract(PANCAKE_ROUTER, ROUTER_ABI, wallet);
  
  const params = {
    tokenIn: USD1,
    tokenOut: WBNB,
    fee: 500, // 0.05% fee tier (common for stablecoins)
    recipient: wallet.address,
    amountIn: balance,
    amountOutMinimum: 0, // Accept any amount (for now, we trust the swap)
    sqrtPriceLimitX96: 0
  };
  
  console.log('Swapping...');
  const swapTx = await router.exactInputSingle(params, { gasLimit: 300000 });
  console.log('Swap tx:', swapTx.hash);
  const receipt = await swapTx.wait();
  console.log('Swap confirmed! Gas used:', receipt.gasUsed.toString());
  
  // Check new BNB balance
  const newBnbBalance = await provider.getBalance(wallet.address);
  console.log('New BNB balance:', ethers.utils.formatEther(newBnbBalance));
}

swap().catch(e => {
  console.error('Error:', e.message);
  if (e.error) console.error('Details:', e.error);
});
