# 🛡️ Safe Approval Guard

**Smart token approval management for EOA and Safe Wallets**

## Problem
- Users approve unlimited spending to unknown contracts
- Safe Wallets (multi-sig) have no easy way to audit/revoke approvals
- Rug pulls exploit unlimited approvals (e.g., $600M Ronin hack)
- No tool unifies EOA + Safe approval management

## Solution
A security dashboard that:
1. **Scans** all ERC20/ERC721 approvals for any wallet
2. **Risk scores** each approval (trusted/unknown/scam)
3. **Batch revokes** risky approvals
4. **Safe-native** — creates multi-sig tx proposals for Safe wallets

## Features

### Phase 1 (MVP - Current)
- ✅ Connect MetaMask / Safe Wallet
- ✅ Fetch ERC20 token approvals
- ✅ Risk levels: 🟢 Safe / 🟡 Unknown / 🔴 Risky
- ✅ Revoke approval (single)

### Phase 2 (Safe Integration)
- [ ] Safe Wallet SDK integration
- [ ] Create batch revoke as Safe transaction
- [ ] Multi-chain support (ETH, Arbitrum, Base, Polygon)

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python + FastAPI + web3.py |
| Frontend | React + ethers.js + Vite |
| Safe Integration | @safe-global/protocol-kit |

## Quick Start

```bash
# Backend
cd src && pip install fastapi uvicorn web3 && python main.py

# Frontend
cd frontend && npm install && npm run dev
```

## Links
- GitHub: https://github.com/dpk-jr/safe-approval-guard
- Safe Apps: https://app.safe.global

## License
MIT
