import { useState } from 'react'
// @ts-ignore
import { useSwap } from 'levr-sdk/dist/esm/client/index.js'
import type { Project, User } from 'levr-sdk'
import { formatUnits } from 'viem'

interface SwapPanelProps {
  project: Project
  user: User | undefined
}

// USD1 stablecoin on BNB Chain  
const USD1_DECIMALS = 18

export function SwapPanel({ project, user }: SwapPanelProps) {
  const [amountIn, setAmountIn] = useState('')
  const [zeroForOne, setZeroForOne] = useState(false) // false = USD1 -> MOLT, true = MOLT -> USD1
  const [slippage, setSlippage] = useState(1) // 1%

  const tokenDecimals = project.token.decimals

  const inDecimals = zeroForOne ? tokenDecimals : USD1_DECIMALS
  const outDecimals = zeroForOne ? USD1_DECIMALS : tokenDecimals

  const {
    swap,
    quote,
    buildSwapConfig,
    isSwapping,
  } = useSwap({
    quoteParams: amountIn ? {
      zeroForOne,
      amountIn,
      amountInDecimals: inDecimals,
      amountOutDecimals: outDecimals,
    } : undefined,
    onSwapSuccess: () => {
      setAmountIn('')
      alert('Swap successful! 🦞')
    },
  })

  const handleFlip = () => {
    setZeroForOne(!zeroForOne)
    setAmountIn('')
  }

  const handleMax = () => {
    // For USD1 pair, we'll need the user to have USD1 balance
    // This will be fetched from the pool's quote currency
    const balance = zeroForOne 
      ? user?.balances.token.formatted 
      : '0' // TODO: Get USD1 balance from user
    setAmountIn(balance ?? '0')
  }

  const handleSwap = async () => {
    if (!amountIn || !quote.data) return

    const minAmountOut = (quote.data.amountOut * BigInt(100 - slippage)) / 100n

    const config = buildSwapConfig({
      zeroForOne,
      amountIn: parseFloat(amountIn),
      amountInDecimals: inDecimals,
      minAmountOut: minAmountOut.toString(),
    })

    if (config) {
      await swap.mutateAsync(config)
    }
  }

  const priceImpact = Number(quote.data?.priceImpactBps ?? 0)
  const isPriceImpactHigh = priceImpact > 100 // >1%

  return (
    <div className="swap-panel">
      <div className="swap-input">
        <div className="input-header">
          <span className="label">You Pay</span>
          <span className="balance" onClick={handleMax}>
            Balance: {zeroForOne 
              ? user?.balances.token.formatted ?? '0'
              : '—' // USD1 balance shown after connect
            }
          </span>
        </div>
        <div className="input-row">
          <input
            type="number"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            disabled={isSwapping}
          />
          <span className="token">{zeroForOne ? '$MOLT' : 'USD1'}</span>
        </div>
      </div>

      <button className="flip-btn" onClick={handleFlip}>
        ⇅
      </button>

      <div className="swap-input">
        <div className="input-header">
          <span className="label">You Receive</span>
        </div>
        <div className="input-row">
          <input
            type="text"
            placeholder="0.0"
            value={quote.data 
              ? formatUnits(quote.data.amountOut, outDecimals)
              : ''
            }
            disabled
            readOnly
          />
          <span className="token">{zeroForOne ? 'USD1' : '$MOLT'}</span>
        </div>
      </div>

      {quote.isLoading && amountIn && (
        <div className="quote-loading">Fetching quote...</div>
      )}

      {quote.data && (
        <div className="quote-details">
          <div className="detail">
            <span>Price Impact</span>
            <span className={isPriceImpactHigh ? 'warning' : ''}>
              {(priceImpact / 100).toFixed(2)}%
            </span>
          </div>
          <div className="detail">
            <span>Slippage Tolerance</span>
            <div className="slippage-options">
              {[0.5, 1, 2].map(s => (
                <button 
                  key={s}
                  className={slippage === s ? 'active' : ''}
                  onClick={() => setSlippage(s)}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
          <div className="detail">
            <span>Minimum Received</span>
            <span>
              {formatUnits(
                (quote.data.amountOut * BigInt(100 - slippage)) / 100n,
                outDecimals
              )} {zeroForOne ? 'USD1' : '$MOLT'}
            </span>
          </div>
        </div>
      )}

      <button 
        className="swap-btn" 
        onClick={handleSwap}
        disabled={isSwapping || !amountIn || !quote.data}
      >
        {isSwapping ? 'Swapping...' : 'Swap'}
      </button>

      <style>{`
        .swap-panel {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .swap-input {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 1rem;
        }
        
        .input-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
        }
        
        .input-header .label { color: #888; }
        .input-header .balance { 
          color: #F5A623; 
          cursor: pointer;
        }
        .input-header .balance:hover { text-decoration: underline; }
        
        .input-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .input-row input {
          flex: 1;
          background: transparent;
          border: none;
          color: #F0E6D3;
          font-size: 1.5rem;
          font-family: inherit;
          outline: none;
        }
        
        .input-row input:disabled {
          color: #888;
        }
        
        .input-row .token {
          font-size: 1rem;
          color: #E85D26;
          font-weight: bold;
        }
        
        .flip-btn {
          align-self: center;
          width: 40px;
          height: 40px;
          background: rgba(232, 93, 38, 0.2);
          border: 2px solid #E85D26;
          border-radius: 12px;
          color: #E85D26;
          font-size: 1.2rem;
          cursor: pointer;
          margin: -0.5rem 0;
          z-index: 1;
        }
        
        .flip-btn:hover {
          background: rgba(232, 93, 38, 0.3);
        }
        
        .quote-loading {
          text-align: center;
          color: #888;
          font-size: 0.85rem;
          padding: 0.5rem;
        }
        
        .quote-details {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 0.75rem;
          font-size: 0.8rem;
        }
        
        .detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
        }
        
        .detail span:first-child { color: #888; }
        .detail span:last-child { color: #F0E6D3; }
        .detail .warning { color: #F5A623; }
        
        .slippage-options {
          display: flex;
          gap: 0.25rem;
        }
        
        .slippage-options button {
          padding: 0.25rem 0.5rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          color: #888;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.75rem;
        }
        
        .slippage-options button.active {
          background: rgba(232, 93, 38, 0.2);
          border-color: #E85D26;
          color: #E85D26;
        }
        
        .swap-btn {
          padding: 1rem;
          background: linear-gradient(135deg, #E85D26, #F5A623);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          margin-top: 0.5rem;
        }
        
        .swap-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
