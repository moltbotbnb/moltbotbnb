import { useState } from 'react'
// @ts-ignore
import { useGovernance, useProposals } from 'levr-sdk/dist/esm/client/index.js'
import type { Project, User } from 'levr-sdk'

interface GovernancePanelProps {
  project: Project
  user: User | undefined
}

export function GovernancePanel({ project, user }: GovernancePanelProps) {
  const [showPropose, setShowPropose] = useState(false)
  const [description, setDescription] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')

  const { data: proposalsData } = useProposals()
  const {
    proposeTransfer,
    vote,
    executeProposal,
    isProposing,
    isVoting,
    isExecuting,
  } = useGovernance({
    onVoteSuccess: () => alert('Vote submitted! 🗳️'),
    onExecuteProposalSuccess: () => alert('Proposal executed! ✅'),
  })

  const proposals = proposalsData?.proposals ?? []
  const votingPower = user?.votingPower ?? '0'

  const handlePropose = async () => {
    if (!recipient || !amount || !description) return
    
    await proposeTransfer.mutateAsync({
      recipient: recipient as `0x${string}`,
      amount,
      description,
    })
    
    setShowPropose(false)
    setDescription('')
    setRecipient('')
    setAmount('')
  }

  const handleVote = async (proposalId: bigint, support: boolean) => {
    await vote.mutateAsync({ proposalId, support })
  }

  const handleExecute = async (proposalId: bigint) => {
    await executeProposal.mutateAsync(proposalId)
  }

  return (
    <div className="governance-panel">
      <div className="voting-power">
        <span className="label">Your Voting Power</span>
        <span className="value">{votingPower}</span>
        <span className="unit">Token Days</span>
      </div>

      <div className="actions-row">
        <button 
          className="propose-btn"
          onClick={() => setShowPropose(!showPropose)}
          disabled={Number(votingPower) === 0}
        >
          {showPropose ? 'Cancel' : 'New Proposal'}
        </button>
      </div>

      {showPropose && (
        <div className="propose-form">
          <input
            type="text"
            placeholder="Recipient address (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            type="text"
            placeholder="Amount (MOLT)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <textarea
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button 
            onClick={handlePropose}
            disabled={isProposing || !recipient || !amount || !description}
          >
            {isProposing ? 'Submitting...' : 'Submit Proposal'}
          </button>
        </div>
      )}

      <div className="proposals-list">
        <h3>Active Proposals</h3>
        {proposals.length === 0 ? (
          <p className="no-proposals">No active proposals</p>
        ) : (
          proposals.map((proposal: any) => (
            <div key={proposal.id} className="proposal-card">
              <div className="proposal-header">
                <span className="proposal-id">#{String(proposal.id)}</span>
                <span className={`proposal-status ${proposal.status}`}>
                  {proposal.status}
                </span>
              </div>
              <p className="proposal-description">{proposal.description}</p>
              <div className="proposal-votes">
                <span>For: {proposal.forVotes}</span>
                <span>Against: {proposal.againstVotes}</span>
              </div>
              <div className="proposal-actions">
                {proposal.status === 'active' && (
                  <>
                    <button 
                      onClick={() => handleVote(proposal.id, true)}
                      disabled={isVoting}
                    >
                      Vote For
                    </button>
                    <button 
                      onClick={() => handleVote(proposal.id, false)}
                      disabled={isVoting}
                    >
                      Vote Against
                    </button>
                  </>
                )}
                {proposal.status === 'succeeded' && (
                  <button 
                    onClick={() => handleExecute(proposal.id)}
                    disabled={isExecuting}
                  >
                    Execute
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .governance-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .voting-power {
          background: linear-gradient(135deg, rgba(232, 93, 38, 0.15), rgba(245, 166, 35, 0.15));
          border: 1px solid rgba(232, 93, 38, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }
        
        .voting-power .label {
          display: block;
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .voting-power .value {
          display: block;
          font-size: 2rem;
          color: #F5A623;
          font-weight: bold;
          margin: 0.25rem 0;
        }
        
        .voting-power .unit {
          font-size: 0.8rem;
          color: #888;
        }
        
        .actions-row {
          display: flex;
          justify-content: center;
        }
        
        .propose-btn {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #E85D26, #F5A623);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
        }
        
        .propose-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .propose-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(0,0,0,0.2);
          padding: 1rem;
          border-radius: 8px;
        }
        
        .propose-form input,
        .propose-form textarea {
          padding: 0.75rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: #F0E6D3;
          font-family: inherit;
        }
        
        .propose-form textarea {
          min-height: 80px;
          resize: vertical;
        }
        
        .propose-form button {
          padding: 0.75rem;
          background: #E85D26;
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }
        
        .proposals-list h3 {
          font-size: 0.9rem;
          color: #888;
          margin-bottom: 0.75rem;
        }
        
        .no-proposals {
          text-align: center;
          color: #666;
          padding: 2rem;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }
        
        .proposal-card {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
        }
        
        .proposal-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .proposal-id {
          color: #E85D26;
          font-weight: bold;
        }
        
        .proposal-status {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        
        .proposal-status.active { background: rgba(52, 152, 219, 0.2); color: #3498db; }
        .proposal-status.succeeded { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .proposal-status.defeated { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .proposal-status.executed { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
        
        .proposal-description {
          color: #F0E6D3;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
        }
        
        .proposal-votes {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #888;
          margin-bottom: 0.75rem;
        }
        
        .proposal-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .proposal-actions button {
          flex: 1;
          padding: 0.5rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          color: #F0E6D3;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.8rem;
        }
        
        .proposal-actions button:hover {
          background: rgba(232, 93, 38, 0.2);
          border-color: #E85D26;
        }
      `}</style>
    </div>
  )
}
