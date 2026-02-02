import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useReadContracts, useBalance } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatUnits } from 'viem'

import { SimpleStakePanel } from './SimpleStakePanel'
import { SimpleSwapPanel } from './SimpleSwapPanel'

// Contract addresses
const MOLT_TOKEN = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07'
const STAKING_CONTRACT = '0x10cf2944b727841730b4d4680b74d7cb6967035e'

// Minimal ABIs
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const STAKING_ABI = [
  {
    name: 'stakedBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalStaked',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function MoltApp() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'stake' | 'swap'>('stake')

  // Read token balance
  const { data: tokenBalance } = useReadContract({
    address: MOLT_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Read staked balance
  const { data: stakedBalance } = useReadContract({
    address: STAKING_CONTRACT,
    abi: STAKING_ABI,
    functionName: 'stakedBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Read total staked
  const { data: totalStaked } = useReadContract({
    address: STAKING_CONTRACT,
    abi: STAKING_ABI,
    functionName: 'totalStaked',
  })

  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: MOLT_TOKEN,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  })

  const decimals = 18

  const formatBalance = (value: bigint | undefined) => {
    if (!value) return '0'
    const formatted = formatUnits(value, decimals)
    const num = parseFloat(formatted)
    if (num > 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
    if (num > 1_000) return (num / 1_000).toFixed(2) + 'K'
    return num.toFixed(2)
  }

  const stakedPercent = totalSupply && totalStaked 
    ? ((Number(totalStaked) / Number(totalSupply)) * 100).toFixed(1)
    : '0'

  return (
    <div className="molt-app">
      <header className="header">
        <div className="logo">
          <span className="lobster">🦞</span>
          <h1>MOLTBOT</h1>
        </div>
        <ConnectButton />
      </header>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat">
          <span className="label">Total Staked</span>
          <span className="value">{formatBalance(totalStaked)} $MOLT</span>
        </div>
        <div className="stat">
          <span className="label">Staked %</span>
          <span className="value">{stakedPercent}%</span>
        </div>
        {isConnected && (
          <>
            <div className="stat">
              <span className="label">Your Balance</span>
              <span className="value">{formatBalance(tokenBalance)} $MOLT</span>
            </div>
            <div className="stat">
              <span className="label">Your Staked</span>
              <span className="value">{formatBalance(stakedBalance)} $MOLT</span>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'stake' ? 'active' : ''} 
          onClick={() => setActiveTab('stake')}
        >
          Stake
        </button>
        <button 
          className={activeTab === 'swap' ? 'active' : ''} 
          onClick={() => setActiveTab('swap')}
        >
          Swap
        </button>
      </div>

      {/* Panel */}
      <div className="panel-container">
        {!isConnected ? (
          <div className="connect-prompt">
            <p>Connect your wallet to stake or swap $MOLT</p>
            <ConnectButton />
          </div>
        ) : activeTab === 'stake' ? (
          <SimpleStakePanel 
            tokenBalance={tokenBalance ?? 0n}
            stakedBalance={stakedBalance ?? 0n}
          />
        ) : (
          <SimpleSwapPanel />
        )}
      </div>

      {/* Links */}
      <div className="links">
        <a href="https://dexscreener.com/bsc/0x8ECa9C65055b42f77fab74cF8265c831585AFB07" target="_blank" rel="noopener noreferrer">
          📊 DexScreener
        </a>
        <a href="https://bscscan.com/token/0x8ECa9C65055b42f77fab74cF8265c831585AFB07" target="_blank" rel="noopener noreferrer">
          🔍 BscScan
        </a>
        <a href="https://x.com/moltbotbnb" target="_blank" rel="noopener noreferrer">
          𝕏 Twitter
        </a>
      </div>
    </div>
  )
}
