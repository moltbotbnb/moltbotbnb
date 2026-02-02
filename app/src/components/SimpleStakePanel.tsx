import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'

const MOLT_TOKEN = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07' as const
const STAKING_CONTRACT = '0x10cf2944b727841730b4d4680b74d7cb6967035e' as const

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const STAKING_ABI = [
  {
    name: 'stake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'unstake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const

interface SimpleStakePanelProps {
  tokenBalance: bigint
  stakedBalance: bigint
}

export function SimpleStakePanel({ tokenBalance, stakedBalance }: SimpleStakePanelProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake')
  const decimals = 18

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: MOLT_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, STAKING_CONTRACT] : undefined,
    query: { enabled: !!address },
  })

  // Contract writes
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract()
  const { writeContract: stake, data: stakeHash, isPending: isStaking } = useWriteContract()
  const { writeContract: unstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract()

  // Wait for transactions
  const { isLoading: isApproveLoading } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isStakeLoading, isSuccess: stakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash })
  const { isLoading: isUnstakeLoading, isSuccess: unstakeSuccess } = useWaitForTransactionReceipt({ hash: unstakeHash })

  const isLoading = isApproving || isApproveLoading || isStaking || isStakeLoading || isUnstaking || isUnstakeLoading

  const handleMax = () => {
    if (mode === 'stake') {
      setAmount(formatUnits(tokenBalance, decimals))
    } else {
      setAmount(formatUnits(stakedBalance, decimals))
    }
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    
    const amountWei = parseUnits(amount, decimals)

    if (mode === 'stake') {
      // Check if we need approval
      if (!allowance || allowance < amountWei) {
        approve({
          address: MOLT_TOKEN,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [STAKING_CONTRACT, amountWei],
        })
        return
      }
      
      stake({
        address: STAKING_CONTRACT,
        abi: STAKING_ABI,
        functionName: 'stake',
        args: [amountWei],
      })
    } else {
      unstake({
        address: STAKING_CONTRACT,
        abi: STAKING_ABI,
        functionName: 'unstake',
        args: [amountWei],
      })
    }
  }

  const needsApproval = mode === 'stake' && amount && allowance !== undefined && 
    allowance < parseUnits(amount || '0', decimals)

  const getButtonText = () => {
    if (isApproving || isApproveLoading) return 'Approving...'
    if (isStaking || isStakeLoading) return 'Staking...'
    if (isUnstaking || isUnstakeLoading) return 'Unstaking...'
    if (needsApproval) return 'Approve $MOLT'
    return mode === 'stake' ? 'Stake $MOLT' : 'Unstake $MOLT'
  }

  const formatDisplay = (value: bigint) => {
    const num = parseFloat(formatUnits(value, decimals))
    if (num > 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
    if (num > 1_000) return (num / 1_000).toFixed(2) + 'K'
    return num.toFixed(2)
  }

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
            ? formatDisplay(tokenBalance)
            : formatDisplay(stakedBalance)
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
        {getButtonText()}
      </button>

      {(stakeSuccess || unstakeSuccess) && (
        <div className="success-msg">
          ✅ {stakeSuccess ? 'Staked' : 'Unstaked'} successfully!
        </div>
      )}

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

        .success-msg {
          text-align: center;
          color: #4CAF50;
          padding: 0.5rem;
          background: rgba(76, 175, 80, 0.1);
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
