import { useState } from 'react'
// @ts-ignore
import { useStake } from 'levr-sdk/dist/esm/client/index.js'
import type { Project, User } from 'levr-sdk'
import { formatUnits } from 'viem'

interface StakePanelProps {
  project: Project
  user: User | undefined
}

export function StakePanel({ project, user }: StakePanelProps) {
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake')

  const {
    approve,
    stake,
    unstake,
    claim,
    needsApproval,
    isApproving,
    isStaking,
    isUnstaking,
    isClaiming,
  } = useStake({
    onStakeSuccess: () => {
      setAmount('')
      alert('Staked successfully! 🦞')
    },
    onUnstakeSuccess: () => {
      setAmount('')
      alert('Unstaked successfully!')
    },
    onClaimSuccess: () => {
      alert('Rewards claimed! 🎉')
    },
  })

  const decimals = project.token.decimals
  const tokenBalance = user?.balances.token.raw ?? 0n
  const stakedBalance = user?.staking.stakedBalance.raw ?? 0n
  const claimableRewards = user?.staking.claimableRewards.staking.raw ?? 0n

  const handleMax = () => {
    if (mode === 'stake') {
      setAmount(formatUnits(tokenBalance, decimals))
    } else {
      setAmount(formatUnits(stakedBalance, decimals))
    }
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    if (mode === 'stake') {
      if (needsApproval(amount)) {
        await approve.mutateAsync(amount)
      }
      await stake.mutateAsync(amount)
    } else {
      await unstake.mutateAsync({ amount })
    }
  }

  const handleClaim = async () => {
    await claim.mutateAsync()
  }

  const isLoading = isApproving || isStaking || isUnstaking || isClaiming

  return (
    <div className="stake-panel">
      <div className="mode-toggle">
        <button 
          className={mode === 'stake' ? 'active' : ''} 
          onClick={() => setMode('stake')}
        >
          Stake
        </button>
        <button 
          className={mode === 'unstake' ? 'active' : ''} 
          onClick={() => setMode('unstake')}
        >
          Unstake
        </button>
      </div>

      <div className="balance-row">
        <span className="label">
          {mode === 'stake' ? 'Wallet Balance' : 'Staked Balance'}
        </span>
        <span className="value">
          {mode === 'stake' 
            ? user?.balances.token.formatted ?? '0'
            : user?.staking.stakedBalance.formatted ?? '0'
          } $MOLT
        </span>
      </div>

      <div className="input-group">
        <input
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
        />
        <button className="max-btn" onClick={handleMax}>MAX</button>
      </div>

      <button 
        className="submit-btn" 
        onClick={handleSubmit}
        disabled={isLoading || !amount || parseFloat(amount) <= 0}
      >
        {isLoading 
          ? (isApproving ? 'Approving...' : mode === 'stake' ? 'Staking...' : 'Unstaking...')
          : mode === 'stake' ? 'Stake $MOLT' : 'Unstake $MOLT'
        }
      </button>

      {claimableRewards > 0n && (
        <div className="rewards-section">
          <div className="rewards-info">
            <span className="label">Claimable Rewards</span>
            <span className="value highlight">
              {user?.staking.claimableRewards.staking.formatted ?? '0'} $MOLT
            </span>
          </div>
          <button 
            className="claim-btn" 
            onClick={handleClaim}
            disabled={isClaiming}
          >
            {isClaiming ? 'Claiming...' : 'Claim Rewards'}
          </button>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <span className="label">APR</span>
          <span className="value">{project.stakingStats?.apr.token.percentage?.toFixed(2) ?? '0'}%</span>
        </div>
        <div className="stat">
          <span className="label">Total Staked</span>
          <span className="value">{String(project.stakingStats?.totalStaked.formatted ?? '0')}</span>
        </div>
        <div className="stat">
          <span className="label">Your Voting Power</span>
          <span className="value">{String(user?.votingPower ?? '0')}</span>
        </div>
      </div>

      <style>{`
        .stake-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .mode-toggle {
          display: flex;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 4px;
        }
        
        .mode-toggle button {
          flex: 1;
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: #888;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
        }
        
        .mode-toggle button.active {
          background: rgba(232, 93, 38, 0.2);
          color: #E85D26;
        }
        
        .balance-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }
        
        .label { color: #888; }
        .value { color: #F0E6D3; }
        .value.highlight { color: #F5A623; }
        
        .input-group {
          display: flex;
          gap: 0.5rem;
        }
        
        .input-group input {
          flex: 1;
          padding: 1rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #F0E6D3;
          font-size: 1.2rem;
          font-family: inherit;
        }
        
        .input-group input:focus {
          outline: none;
          border-color: #E85D26;
        }
        
        .max-btn {
          padding: 0 1rem;
          background: rgba(232, 93, 38, 0.2);
          border: 1px solid #E85D26;
          color: #E85D26;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.8rem;
        }
        
        .submit-btn {
          padding: 1rem;
          background: linear-gradient(135deg, #E85D26, #F5A623);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s;
        }
        
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .rewards-section {
          background: rgba(245, 166, 35, 0.1);
          border: 1px solid rgba(245, 166, 35, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }
        
        .rewards-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        
        .claim-btn {
          width: 100%;
          padding: 0.75rem;
          background: #F5A623;
          border: none;
          border-radius: 6px;
          color: #0A0A0A;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
        }
        
        .claim-btn:disabled {
          opacity: 0.5;
        }
        
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .stat {
          background: rgba(0,0,0,0.2);
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
        }
        
        .stat .label {
          display: block;
          font-size: 0.65rem;
          margin-bottom: 0.25rem;
        }
        
        .stat .value {
          font-size: 0.9rem;
          color: #F5A623;
        }
      `}</style>
    </div>
  )
}
