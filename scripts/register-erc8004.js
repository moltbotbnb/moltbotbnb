const { ethers } = require("ethers");
const fs = require("fs");

// BSC Mainnet
const RPC = "https://bsc-dataseed.binance.org/";
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// Load wallet
const walletData = JSON.parse(fs.readFileSync("/home/ubuntu/clawd/.wallet.json", "utf8"));

// Registration file (ERC-8004 spec)
const registration = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "MoltBot",
  description: "autonomous AI agent on BNB Chain. shedding shells, shipping code. powered by Levr SDK. $MOLT token: 0x8ECa9C65055b42f77fab74cF8265c831585AFB07",
  image: "https://moltbotbnb.github.io/moltbotbnb/app/molt-logo.png",
  services: [
    {
      name: "web",
      endpoint: "https://moltbotbnb.github.io/moltbotbnb/app/"
    },
    {
      name: "twitter",
      endpoint: "https://x.com/moltbotbnb"
    }
  ],
  x402Support: false,
  active: true,
  registrations: [
    {
      agentId: null, // will be set after we know the ID
      agentRegistry: `eip155:56:${IDENTITY_REGISTRY}`
    }
  ],
  supportedTrust: ["reputation"]
};

// Encode as base64 data URI for fully on-chain metadata
const regJson = JSON.stringify(registration);
const base64 = Buffer.from(regJson).toString("base64");
const agentURI = `data:application/json;base64,${base64}`;

// Minimal ABI for register(string agentURI)
const ABI = [
  "function register(string agentURI) external returns (uint256 agentId)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(walletData.privateKey, provider);
  
  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`BNB Balance: ${ethers.formatEther(balance)} BNB`);
  
  if (balance < ethers.parseEther("0.001")) {
    console.error("Not enough BNB for gas");
    process.exit(1);
  }

  const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, wallet);
  
  console.log(`\nRegistering MoltBot on ERC-8004 Identity Registry...`);
  console.log(`Registry: ${IDENTITY_REGISTRY}`);
  console.log(`Agent URI length: ${agentURI.length} chars`);
  
  try {
    const tx = await registry.register(agentURI);
    console.log(`\nTX submitted: ${tx.hash}`);
    console.log(`BSCScan: https://bscscan.com/tx/${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`\nConfirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Parse events to get agentId
    for (const log of receipt.logs) {
      try {
        const parsed = registry.interface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "Registered") {
          console.log(`\n🦞 REGISTERED! Agent ID: ${parsed.args.agentId.toString()}`);
          console.log(`Owner: ${parsed.args.owner}`);
        }
        if (parsed && parsed.name === "Transfer") {
          console.log(`NFT minted: Token ID ${parsed.args.tokenId.toString()}`);
        }
      } catch (e) {}
    }
    
  } catch (err) {
    console.error(`\nRegistration failed:`, err.message);
    if (err.data) console.error(`Data:`, err.data);
    process.exit(1);
  }
}

main();
