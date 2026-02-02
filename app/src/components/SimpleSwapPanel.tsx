export function SimpleSwapPanel() {
  const MOLT_TOKEN = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07'
  
  return (
    <div className="swap-panel">
      <h3>Swap $MOLT</h3>
      
      <p className="desc">
        Trade $MOLT on your favorite DEX:
      </p>

      <div className="swap-links">
        <a 
          href={`https://pancakeswap.finance/swap?outputCurrency=${MOLT_TOKEN}&chain=bsc`}
          target="_blank"
          rel="noopener noreferrer"
          className="swap-btn pancake"
        >
          🥞 PancakeSwap
        </a>
        
        <a 
          href={`https://app.1inch.io/#/56/simple/swap/BNB/${MOLT_TOKEN}`}
          target="_blank"
          rel="noopener noreferrer"
          className="swap-btn oneinch"
        >
          🦄 1inch
        </a>
        
        <a 
          href={`https://dexscreener.com/bsc/${MOLT_TOKEN}`}
          target="_blank"
          rel="noopener noreferrer"
          className="swap-btn dex"
        >
          📊 DexScreener
        </a>
      </div>

      <div className="contract-info">
        <span className="label">Contract:</span>
        <code>{MOLT_TOKEN}</code>
        <button 
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(MOLT_TOKEN)}
        >
          📋
        </button>
      </div>

      <style>{`
        .swap-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          text-align: center;
        }
        
        .swap-panel h3 {
          margin: 0;
          color: #F5A623;
        }
        
        .desc {
          color: #888;
          margin: 0;
        }
        
        .swap-links {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .swap-btn {
          display: block;
          padding: 1rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          transition: transform 0.2s, opacity 0.2s;
        }
        
        .swap-btn:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }
        
        .swap-btn.pancake {
          background: linear-gradient(135deg, #633001, #d1884f);
          color: white;
        }
        
        .swap-btn.oneinch {
          background: linear-gradient(135deg, #1B314F, #2F80ED);
          color: white;
        }
        
        .swap-btn.dex {
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          color: #00d4aa;
          border: 1px solid #00d4aa;
        }
        
        .contract-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          font-size: 0.75rem;
        }
        
        .contract-info .label {
          color: #888;
        }
        
        .contract-info code {
          color: #F0E6D3;
          font-size: 0.65rem;
          word-break: break-all;
        }
        
        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.25rem;
        }
        
        .copy-btn:hover {
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}
