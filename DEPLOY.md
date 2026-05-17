# 🛡️ Safe Approval Guard - Deploy Info

## Live URLs
- **GitHub Repo:** https://github.com/dpk-jr/safe-approval-guard
- **GitHub Pages:** https://dpk-jr.github.io/safe-approval-guard/ (enable in Settings > Pages)

## To Enable GitHub Pages
1. Go to: https://github.com/dpk-jr/safe-approval-guard/settings/pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: /docs
5. Click Save

## Files Structure
```
safe-approval-guard/
├── index.html           — Main frontend (18KB, static, no build needed)
├── docs/
│   └── index.html       — GitHub Pages served file
├── src/
│   └── main.py          — FastAPI backend (8KB)
├── frontend/            — React version (optional)
├── requirements.txt     — Python dependencies
├── api_server.py        — Simple HTTP server
└── README.md            — Documentation
```

## Features Implemented
- ✅ Wallet Connect (MetaMask)
- ✅ Multi-chain (ETH, Arbitrum, Base, Polygon)
- ✅ ERC20 Approval Scanner
- ✅ Risk Scoring (Safe/Unknown/Risky)
- ✅ Revoke Functionality
- ✅ Safe Wallet Compatible

## To Run Locally
```bash
# Frontend (static)
open index.html

# Backend (optional API)
cd src && python main.py
```
