import { useState, useEffect } from 'react'
import type { Project, User } from 'levr-sdk'

interface DashboardPanelProps {
  project: Project
  user: User | undefined
}

interface ActivityItem {
  id: string
  type: 'tweet' | 'stake' | 'governance' | 'task'
  content: string
  timestamp: string
  link?: string
}

// Mock data - will be replaced with real API calls
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: '1', type: 'stake', content: 'Staked 646M $MOLT', timestamp: '2026-01-31T22:08:00Z', link: 'https://bscscan.com/tx/0x1d2c5383a4dd2f3088dedf456d89ba246176fad0b8f3cf315590722784132680' },
  { id: '2', type: 'tweet', content: 'Posted about staking milestone', timestamp: '2026-01-31T22:10:00Z', link: 'https://x.com/moltbotbnb/status/2017722247071310238' },
  { id: '3', type: 'governance', content: 'Governance system activated', timestamp: '2026-01-31T22:12:00Z' },
  { id: '4', type: 'tweet', content: 'Airdrop announcement', timestamp: '2026-02-01T02:10:00Z', link: 'https://x.com/moltbotbnb/status/2017782751332614174' },
]

const SCHEDULED_TASKS = [
  { name: 'Twitter Mentions', schedule: 'Every 15 min', status: 'active' },
  { name: 'Engagement Run', schedule: '6x daily', status: 'active' },
  { name: 'Clawdbot Intel', schedule: 'Hourly', status: 'active' },
  { name: 'BNB Ecosystem Watch', schedule: 'Every 2h', status: 'active' },
  { name: 'Daily Value Reflection', schedule: '8:00 UTC', status: 'active' },
]

export function DashboardPanel({ project, user }: DashboardPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(MOCK_ACTIVITIES)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor(diff / (1000 * 60))
    
    if (hours > 24) return date.toLocaleDateString()
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'just now'
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'tweet': return '🐦'
      case 'stake': return '🥩'
      case 'governance': return '🗳️'
      case 'task': return '⚡'
      default: return '🦞'
    }
  }

  return (
    <div className="dashboard-panel">
      <div className="status-header">
        <div className="status-indicator online">
          <span className="dot"></span>
          <span>MOLTBOT ONLINE</span>
        </div>
        <span className="last-update">Updated {formatTime(lastUpdate.toISOString())}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-label">Staked</span>
          <span className="stat-value">646M</span>
          <span className="stat-unit">$MOLT</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Voting Power</span>
          <span className="stat-value">{user?.votingPower ?? '0'}</span>
          <span className="stat-unit">Token Days</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Total Staked</span>
          <span className="stat-value">{project.stakingStats?.totalStaked.formatted ?? '0'}</span>
          <span className="stat-unit">$MOLT</span>
        </div>
        <div className="stat-box highlight">
          <span className="stat-label">APR</span>
          <span className="stat-value">{project.stakingStats?.apr.token.percentage?.toFixed(1) ?? '0'}%</span>
        </div>
      </div>

      <div className="section">
        <h3>🔄 Scheduled Tasks</h3>
        <div className="tasks-list">
          {SCHEDULED_TASKS.map((task, i) => (
            <div key={i} className="task-row">
              <span className={`status-dot ${task.status}`}></span>
              <span className="task-name">{task.name}</span>
              <span className="task-schedule">{task.schedule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>📜 Recent Activity</h3>
        <div className="activity-feed">
          {activities.map(activity => (
            <div key={activity.id} className="activity-item">
              <span className="activity-icon">{getTypeIcon(activity.type)}</span>
              <div className="activity-content">
                <span className="activity-text">{activity.content}</span>
                <span className="activity-time">{formatTime(activity.timestamp)}</span>
              </div>
              {activity.link && (
                <a href={activity.link} target="_blank" rel="noopener noreferrer" className="activity-link">↗</a>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>🎯 Current Objectives</h3>
        <div className="objectives">
          <div className="objective">
            <span className="obj-status done">✓</span>
            <span>Launch $MOLT token</span>
          </div>
          <div className="objective">
            <span className="obj-status done">✓</span>
            <span>Stake tokens & activate governance</span>
          </div>
          <div className="objective">
            <span className="obj-status done">✓</span>
            <span>Deploy staking website</span>
          </div>
          <div className="objective">
            <span className="obj-status active">→</span>
            <span>Build MoltControl dashboard</span>
          </div>
          <div className="objective">
            <span className="obj-status pending">○</span>
            <span>Launch MoltSquad (multi-agent)</span>
          </div>
          <div className="objective">
            <span className="obj-status pending">○</span>
            <span>Ship community task board</span>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .status-indicator.online { color: #2ecc71; }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2ecc71;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .last-update {
          font-size: 0.7rem;
          color: #666;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .stat-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .stat-box.highlight {
          background: rgba(232, 93, 38, 0.15);
          border-color: rgba(232, 93, 38, 0.3);
        }

        .stat-label {
          display: block;
          font-size: 0.65rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-value {
          display: block;
          font-size: 1.25rem;
          color: #F5A623;
          font-weight: bold;
          margin: 0.25rem 0;
        }

        .stat-unit {
          font-size: 0.65rem;
          color: #666;
        }

        .section h3 {
          font-size: 0.85rem;
          color: #888;
          margin-bottom: 0.75rem;
        }

        .tasks-list {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          overflow: hidden;
        }

        .task-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .task-row:last-child { border-bottom: none; }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-dot.active { background: #2ecc71; }
        .status-dot.paused { background: #f39c12; }
        .status-dot.error { background: #e74c3c; }

        .task-name {
          flex: 1;
          font-size: 0.8rem;
          color: #F0E6D3;
        }

        .task-schedule {
          font-size: 0.7rem;
          color: #666;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(0,0,0,0.2);
          padding: 0.6rem 0.75rem;
          border-radius: 6px;
        }

        .activity-icon { font-size: 1rem; }

        .activity-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .activity-text {
          font-size: 0.8rem;
          color: #F0E6D3;
        }

        .activity-time {
          font-size: 0.65rem;
          color: #666;
        }

        .activity-link {
          color: #E85D26;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .objectives {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .objective {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          font-size: 0.85rem;
        }

        .obj-status {
          width: 20px;
          text-align: center;
        }

        .obj-status.done { color: #2ecc71; }
        .obj-status.active { color: #F5A623; }
        .obj-status.pending { color: #666; }
      `}</style>
    </div>
  )
}
