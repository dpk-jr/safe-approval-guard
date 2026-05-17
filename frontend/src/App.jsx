import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

// ============ CONFIG ============
const CHAINS = {
  1: { name: 'Ethereum', rpc: 'https://eth.drpc.org' },
  42161: { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
  8453: { name: 'Base', rpc: 'https://mainnet.base.org' },
  137: { name: 'Polygon', rpc: 'https://polygon-rpc.com' },
}

const TRUSTED_SPENDERS = {
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': 'Uniswap Universal Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap Universal Router 2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x881d40237659c251811cec9c364ef91dc08d300c': 'Metamask Swap Router',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch V5 Router',
}

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

// ============ COMPONENTS ============

function App() {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(1)
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!')
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const network = await provider.getNetwork()
      
      setAccount(accounts[0])
      setChainId(Number(network.chainId))
    } catch (err) {
      setError(err.message)
    }
  }

  // Disconnect
  const disconnect = () => {
    setAccount(null)
    setApprovals([])
  }

  // Listen for account/chain changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null)
      })
      window.ethereum.on('chainChanged', (chainId) => {
        setChainId(parseInt(chainId, 16))
      })
    }
  }, [])

  // Scan approvals
  const scanApprovals = async () => {
    if (!account) return

    setScanning(true)
    setError(null)
    
    try {
      const provider = new ethers.JsonRpcProvider(CHAINS[chainId].rpc)
      const wallet = ethers.getAddress(account)
      
      // Known tokens to scan
      const tokens = [
        { address: '0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48', name: 'USDC' },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'USDT' },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'DAI' },
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'WETH' },
        { address: '0x2260FAC5E5542a773Aa44fBCfedf7C193bc2C599', name: 'WBTC' },
        { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', name: 'LINK' },
        { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', name: 'UNI' },
        { address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', name: 'AAVE' },
        { address: '0x509Ee0d083DdF8AC028f2a56731412edD63223B9', name: 'stETH' },
        { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', name: 'stETH (old)' },
      ]

      const results = []

      for (const token of tokens) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider)
          
          // Check common routers
          const routers = Object.keys(TRUSTED_SPENDERS)
          
          for (const router of routers) {
            const allowance = await contract.allowance(wallet, router)
            
            if (allowance > 0n) {
              const decimals = await contract.decimals()
              const formattedAllowance = ethers.formatUnits(allowance, decimals)
              
              results.push({
                tokenAddress: token.address,
                tokenName: token.name,
                spender: router,
                spenderName: TRUSTED_SPENDERS[router],
                allowance: formattedAllowance,
                isUnlimited: allowance > ethers.parseUnits('1000000', decimals),
                riskLevel: 'safe', // Known spender
              })
            }
          }
        } catch (e) {
          console.log(`Error scanning ${token.name}:`, e)
        }
      }

      setApprovals(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  // Revoke approval
  const revokeApproval = async (tokenAddress, spender) => {
    if (!account) return

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
      
      const tx = await contract.approve(spender, 0)
      await tx.wait()
      
      // Remove from list
      setApprovals(prev => prev.filter(a => a.tokenAddress !== tokenAddress || a.spender !== spender))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Summary stats
  const summary = {
    total: approvals.length,
    safe: approvals.filter(a => a.riskLevel === 'safe').length,
    unknown: approvals.filter(a => a.riskLevel === 'unknown').length,
    risky: approvals.filter(a => a.riskLevel === 'risky').length,
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
          <span>Safe Approval Guard</span>
        </div>
        
        <div className="header-actions">
          {account ? (
            <div className="wallet-info">
              <select value={chainId} onChange={(e) => setChainId(Number(e.target.value))}>
                {Object.entries(CHAINS).map(([id, chain]) => (
                  <option key={id} value={id}>{chain.name}</option>
                ))}
              </select>
              
              <span className="wallet-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              
              <button className="btn btn-secondary" onClick={disconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet}>
              🔗 Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-red)' }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Main Content */}
      {account ? (
        <>
          {/* Summary */}
          <div className="summary">
            <div className="stat-card">
              <div className="stat-value">{summary.total}</div>
              <div className="stat-label">Total Approvals</div>
            </div>
            <div className="stat-card stat-safe">
              <div className="stat-value">{summary.safe}</div>
              <div className="stat-label">🟢 Safe</div>
            </div>
            <div className="stat-card stat-unknown">
              <div className="stat-value">{summary.unknown}</div>
              <div className="stat-label">🟡 Unknown</div>
            </div>
            <div className="stat-card stat-risky">
              <div className="stat-value">{summary.risky}</div>
              <div className="stat-label">🔴 Risky</div>
            </div>
          </div>

          {/* Approvals Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Token Approvals</h2>
              <button 
                className="btn btn-primary" 
                onClick={scanApprovals}
                disabled={scanning}
              >
                {scanning ? '⏳ Scanning...' : '🔄 Scan Again'}
              </button>
            </div>

            {scanning ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Scanning approvals on {CHAINS[chainId].name}...</p>
              </div>
            ) : approvals.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">✨</div>
                <p>No active approvals found or click Scan to check</p>
                <button className="btn btn-primary" onClick={scanApprovals} style={{ marginTop: '16px' }}>
                  🔍 Scan Approvals
                </button>
              </div>
            ) : (
              <table className="approval-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Approved To</th>
                    <th>Allowance</th>
                    <th>Risk</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval, idx) => (
                    <tr key={idx} className="approval-row">
                      <td>
                        <div className="token-info">
                          <div className="token-icon">
                            {approval.tokenName.slice(0, 2)}
                          </div>
                          <div className="token-details">
                            <h4>{approval.tokenName}</h4>
                            <span>{approval.tokenAddress.slice(0, 10)}...</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="spender-info">
                          <span className="spender-name">{approval.spenderName}</span>
                          <span className="spender-address">{approval.spender.slice(0, 12)}...</span>
                        </div>
                      </td>
                      <td>
                        {approval.isUnlimited ? '∞ Unlimited' : approval.allowance}
                      </td>
                      <td>
                        <span className={`risk-badge risk-${approval.riskLevel}`}>
                          {approval.riskLevel === 'safe' && '🟢 Safe'}
                          {approval.riskLevel === 'unknown' && '🟡 Unknown'}
                          {approval.riskLevel === 'risky' && '🔴 Risky'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger action-btn"
                          onClick={() => revokeApproval(approval.tokenAddress, approval.spender)}
                          disabled={loading}
                        >
                          {loading ? '...' : '🚫 Revoke'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Safe Wallet Info */}
          <div className="card">
            <h3 className="card-title">🏠 Safe Wallet Users</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              This dApp supports Safe Wallet! Connect your Safe via the official Safe App interface 
              to create multi-sig revoke proposals.
            </p>
            <div style={{ marginTop: '16px' }}>
              <a 
                href="https://app.safe.global" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Open Safe Apps →
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">🔐</div>
            <h2>Connect Your Wallet</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Scan and manage token approvals for your EOA or Safe Wallet
            </p>
            <button className="btn btn-primary" onClick={connectWallet} style={{ marginTop: '24px' }}>
              🔗 Connect MetaMask
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
        <p>Built with ❤️ for security | Safe Approval Guard v1.0</p>
      </footer>
    </div>
  )
}

export default App
