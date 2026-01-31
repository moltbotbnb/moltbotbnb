import type { Project, User } from 'levr-sdk'

interface StatsPanelProps {
  project: Project
  user: User | undefined
}

export function StatsPanel({ project, user }: StatsPanelProps) {
  return (
    <div className="stats-panel">
      <div className="stat-card">
        <span className="label">Your Balance</span>
        <span className="value">{user?.balances.token.formatted ?? '0'}</span>
        <span className="unit">$MOLT</span>
      </div>
      <div className="stat-card">
        <span className="label">Staked</span>
        <span className="value">{user?.staking.stakedBalance.formatted ?? '0'}</span>
        <span className="unit">$MOLT</span>
      </div>
      <div className="stat-card highlight">
        <span className="label">APR</span>
        <span className="value">{project.stakingStats?.apr.token.percentage?.toFixed(1) ?? '0'}%</span>
      </div>
      <div className="stat-card">
        <span className="label">Total Staked</span>
        <span className="value">{project.stakingStats?.totalStaked.formatted ?? '0'}</span>
        <span className="unit">$MOLT</span>
      </div>

      <style>{`
        .stats-panel {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 1rem;
          text-align: center;
        }
        
        .stat-card.highlight {
          background: rgba(232, 93, 38, 0.1);
          border-color: rgba(232, 93, 38, 0.3);
        }
        
        .stat-card .label {
          display: block;
          font-size: 0.7rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.25rem;
        }
        
        .stat-card .value {
          display: block;
          font-size: 1.25rem;
          color: #F0E6D3;
          font-weight: bold;
        }
        
        .stat-card.highlight .value {
          color: #F5A623;
        }
        
        .stat-card .unit {
          font-size: 0.7rem;
          color: #666;
        }
      `}</style>
    </div>
  )
}
