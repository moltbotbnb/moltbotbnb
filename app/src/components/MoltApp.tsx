import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
// @ts-ignore
import { useSetClankerToken, useProject, useUser } from 'levr-sdk/dist/esm/client/index.js'

import { StakePanel } from './StakePanel'
import { SwapPanel } from './SwapPanel'
import { StatsPanel } from './StatsPanel'
import { GovernancePanel } from './GovernancePanel'
import { DashboardPanel } from './DashboardPanel'

interface MoltAppProps {
  clankerToken: `0x${string}`
}

export function MoltApp({ clankerToken }: MoltAppProps) {
  useSetClankerToken(clankerToken)
  
  const { isConnected } = useAccount()
  const { data: project, isLoading: projectLoading } = useProject()
  const { data: userData } = useUser()
  const user = userData ?? undefined
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stake' | 'swap' | 'govern'>('dashboard')

  return (
    <div className="molt-app">
      <header className="header">
        <div className="logo">
          <span className="lobster">🦞</span>
          <h1>MOLTBOT</h1>
        </div>
        <ConnectButton />
      </header>

      {projectLoading ? (
        <div className="loading">Loading...</div>
      ) : !project ? (
        <div className="error">Failed to load project data</div>
      ) : (
        <>
          <StatsPanel project={project} user={user} />

          <div className="tabs">
            <button 
              className={activeTab === 'dashboard' ? 'active' : ''} 
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
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
            <button 
              className={activeTab === 'govern' ? 'active' : ''} 
              onClick={() => setActiveTab('govern')}
            >
              Govern
            </button>
          </div>

          <div className="panel-container">
            {!isConnected ? (
              <div className="connect-prompt">
                <p>Connect your wallet to stake, unstake, or swap $MOLT</p>
                <ConnectButton />
              </div>
            ) : activeTab === 'dashboard' ? (
              <DashboardPanel project={project} user={user} />
            ) : activeTab === 'stake' ? (
              <StakePanel project={project} user={user} />
            ) : activeTab === 'swap' ? (
              <SwapPanel project={project} user={user} />
            ) : (
              <GovernancePanel project={project} user={user} />
            )}
          </div>
        </>
      )}

      <style>{`
        .molt-app {
          max-width: 480px;
          margin: 0 auto;
          padding: 1rem;
          font-family: 'Space Mono', monospace;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logo .lobster { font-size: 2rem; }
        .logo h1 { 
          font-size: 1.2rem; 
          background: linear-gradient(135deg, #E85D26, #F5A623);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .tabs button {
          flex: 1;
          padding: 0.75rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #888;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }
        
        .tabs button.active {
          background: rgba(232, 93, 38, 0.15);
          border-color: #E85D26;
          color: #E85D26;
        }
        
        .panel-container {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        .connect-prompt {
          text-align: center;
          padding: 2rem;
        }
        
        .connect-prompt p {
          color: #888;
          margin-bottom: 1rem;
        }
        
        .loading, .error {
          text-align: center;
          padding: 3rem;
          color: #888;
        }
      `}</style>
    </div>
  )
}
