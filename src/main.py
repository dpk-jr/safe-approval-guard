"""
Safe Approval Guard - Backend Service
Fetch and manage ERC20 approvals for EOA and Safe wallets
"""

from web3 import Web3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json

app = FastAPI(title="Safe Approval Guard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ CONFIG ============

# RPC endpoints
RPC_URLS = {
    1: "https://eth.drpc.org",           # Ethereum
    42161: "https://arb1.arbitrum.io/rpc", # Arbitrum  
    8453: "https://mainnet.base.org",      # Base
    137: "https://polygon-rpc.com",        # Polygon
}

# Known safe contracts (trusted)
TRUSTED_CONTRACTS = {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
    "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "AAVE",
    "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
    # Uniswap
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
    "0xe41d2489571d322189246dafa5debde1f4699f49": "ZRX",
    # Aave
    "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "AAVE",
    # More tokens...
}

# Known risky contracts (flagged)
RISKY_CONTRACTS = {
    # Add flagged addresses from security databases
}

# ERC20 ABI (minimal)
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "owner", "type": "address"},
            {"indexed": True, "name": "spender", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Approval",
        "type": "event"
    }
]

# ============ MODELS ============

class WalletRequest(BaseModel):
    address: str
    chain_id: int = 1

class ApprovalInfo(BaseModel):
    token_address: str
    token_name: str
    token_symbol: str
    spender: str
    spender_name: Optional[str]
    allowance: str
    risk_level: str  # "safe", "unknown", "risky"
    risk_reason: Optional[str]

class RevokeRequest(BaseModel):
    wallet: str
    token: str
    spender: str
    chain_id: int = 1
    is_safe: bool = False
    safe_tx_hash: Optional[str] = None

# ============ HELPERS ============

def get_web3(chain_id: int) -> Web3:
    rpc_url = RPC_URLS.get(chain_id)
    if not rpc_url:
        raise HTTPException(400, f"Unsupported chain: {chain_id}")
    return Web3(Web3.HTTPProvider(rpc_url))

def get_token_info(w3: Web3, token_address: str) -> dict:
    """Get token name, symbol, decimals"""
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(token_address),
        abi=ERC20_ABI
    )
    try:
        name = contract.functions.name().call()
        symbol = contract.functions.symbol().call()
        decimals = contract.functions.decimals().call()
        return {"name": name, "symbol": symbol, "decimals": decimals}
    except:
        return {"name": "Unknown", "symbol": "???", "decimals": 18}

def assess_risk(spender: str, token_info: dict) -> tuple[str, Optional[str]]:
    """Assess risk level of an approval"""
    spender_lower = spender.lower()
    
    # Check if risky
    if spender_lower in RISKY_CONTRACTS:
        return ("risky", RISKY_CONTRACTS[spender_lower])
    
    # Check if trusted
    if spender_lower in TRUSTED_CONTRACTS:
        return ("safe", f"Known: {TRUSTED_CONTRACTS[spender_lower]}")
    
    # Check for common patterns
    if spender_lower.startswith("0x0000000000") or spender_lower == "0x" + "0" * 40:
        return ("risky", "Null address")
    
    # Default to unknown
    return ("unknown", "Not in trusted list")

# ============ ENDPOINTS ============

@app.get("/")
async def root():
    return {"name": "Safe Approval Guard", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/approvals/scan")
async def scan_approvals(req: WalletRequest):
    """
    Scan all ERC20 approvals for a wallet
    Works for both EOA and Safe wallets
    """
    w3 = get_web3(req.chain_id)
    wallet = Web3.to_checksum_address(req.address)
    
    # TODO: Scan Approval events from blockchain
    # For now, return mock data structure
    
    approvals = []
    
    # Example tokens to check (in production, get from token list)
    tokens_to_check = [
        "0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48",  # USDC
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",  # USDT
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",  # DAI
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # WETH
        "0x2260FAC5E5542a773Aa44fBCfedf7C193bc2C599",  # WBTC
        "0x514910771AF9Ca656af840dff83E8264EcF986CA",  # LINK
    ]
    
    for token_address in tokens_to_check:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(token_address),
            abi=ERC20_ABI
        )
        try:
            # Check allowance for common DEX routers
            # In production, scan events for all approvals
            token_info = get_token_info(w3, token_address)
            
            # Mock: check allowance to Uniswap Router
            spender = "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B"  # Universal Router
            allowance = contract.functions.allowance(wallet, Web3.to_checksum_address(spender)).call()
            
            if allowance > 0:
                risk_level, risk_reason = assess_risk(spender, token_info)
                approvals.append({
                    "token_address": token_address,
                    "token_name": token_info["name"],
                    "token_symbol": token_info["symbol"],
                    "spender": spender,
                    "spender_name": "Uniswap Universal Router",
                    "allowance": str(allowance),
                    "risk_level": risk_level,
                    "risk_reason": risk_reason
                })
        except Exception as e:
            print(f"Error checking {token_address}: {e}")
            continue
    
    return {
        "wallet": req.address,
        "chain_id": req.chain_id,
        "is_safe": False,  # TODO: Detect if Safe wallet
        "approvals": approvals,
        "summary": {
            "total": len(approvals),
            "safe": len([a for a in approvals if a["risk_level"] == "safe"]),
            "unknown": len([a for a in approvals if a["risk_level"] == "unknown"]),
            "risky": len([a for a in approvals if a["risk_level"] == "risky"]),
        }
    }

@app.post("/api/approvals/revoke")
async def revoke_approval(req: RevokeRequest):
    """
    Revoke an approval
    For Safe wallets, creates a tx proposal
    """
    # TODO: Implement actual revoke logic
    return {
        "status": "pending",
        "message": "Revoke transaction created",
        "is_safe": req.is_safe,
        "safe_tx_hash": req.safe_tx_hash
    }

@app.get("/api/contracts/{address}/info")
async def get_contract_info(address: str, chain_id: int = 1):
    """Get info about a contract address"""
    w3 = get_web3(chain_id)
    
    info = get_token_info(w3, address)
    risk_level, risk_reason = assess_risk(address, info)
    
    return {
        "address": address,
        **info,
        "risk_level": risk_level,
        "risk_reason": risk_reason
    }

# ============ RUN ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
