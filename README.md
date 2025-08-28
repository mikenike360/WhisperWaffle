
# 🧇 WhisperWaffle - The Sweetest DEX on Aleo

![WhisperWaffle Logo](public/logo.png)

**WhisperWaffle** is a **Minimum Viable Product (MVP)** built for the **Aleo Code Sprint 4.0**, demonstrating core DeFi functionality on the Aleo blockchain. This MVP showcases the potential of building decentralized exchanges on Aleo while maintaining simplicity for the sprint deadline.

## 🚀 **MVP for Aleo Code Sprint 4.0**

### **What's Included (MVP)**
- **Fixed Rate Trading**: 4:1 exchange rate (4 wALEO = 1 wUSDC)
- **Liquidity Pools**: Basic pool creation and management
- **Wrapped Tokens**: ALEO ↔ wALEO conversion
- **Public Transactions**: No privacy features for sprint demo

### **Future Features (Post-Sprint)**
- **Privacy**: Zero-knowledge proof integration
- **AMM**: Replace fixed rate with market-driven pricing
- **Advanced Features**: Cross-chain bridge, governance, mobile app

## 🏗️ **Architecture**

### **Smart Contracts**
- **Main DEX**: `ww_swap_v13.aleo` - Fixed rate swaps and pool management
- **Wrapped Credits**: `ww_swap_wrapped_credits_v1.aleo` - ALEO ↔ wALEO conversion
- **Language**: Leo 3.1.0
- **Network**: Aleo Testnet Beta

### **Key Functions**
- **Swaps**: `swap_waleo_for_token()`, `swap_token_for_waleo()` (4:1 fixed rate)
- **Pools**: `create_pool_public()`, `add_liquidity_public()`, `remove_liquidity_public()`
- **Wrapping**: `deposit_credits_public_signer()`, `withdraw_credits_public_signer()`

## 🎯 **MVP Scope**

### **What's Included**
- **Fixed Rate Trading**: 4:1 exchange rate (4 wALEO = 1 wUSDC)
- **Liquidity Pools**: Basic pool creation and management
- **Wrapped Tokens**: ALEO ↔ wALEO conversion
- **Public Transactions**: No privacy features for sprint demo

### **Limitations**
- **Fixed Rate**: 4:1 rate doesn't change with market conditions
- **Not AMM**: Uses fixed rate instead of automated market making
- **Testnet Only**: Not production-ready

## 🎯 **Key Features**

### **Tokens**
- **wALEO**: Wrapped ALEO token for DeFi operations
- **wUSDC**: Custom token for trading
- **Fixed Rate**: 4:1 exchange rate (4 wALEO = 1 wUSDC)

### **Trading**
- **Fixed Rate Swaps**: Direct conversion at 4:1 rate
- **Liquidity Pools**: Basic pool management
- **Fee**: 0.3% swap fee

### **Environment Configuration**
- **Network**: Testnet Beta (configurable for mainnet)
- **wALEO Token ID**: `68744147421264673966385360field`
- **wUSDC Token ID**: `42069187360666field`
- **Pool ID**: Fixed pool ID (1field) for initial deployment

## 📱 **User Interface**

- **Dashboard**: Swap interface and liquidity management
- **Token Management**: Token creation and role management
- **Token Unlock**: Token unlocking and role management
- **Modern UI**: Clean interface with cyberpunk theme

## 🔒 **Security & Privacy**

### **Current Features**
- **Input Validation**: Parameter checking and error handling
- **Token Approvals**: Secure spending permissions
- **Public Transactions**: No privacy features for sprint demo

### **Future Features**
- **Zero-Knowledge Proofs**: Complete transaction privacy
- **Hidden Balances**: Concealed user balances

## 📊 **Performance**

- **Efficient**: Optimized for Aleo blockchain
- **Low Cost**: Minimal gas usage
- **Real-time**: Live updates and transaction tracking

## 🤝 **Contributing**

We welcome contributions! Please see our contributing guidelines for code standards, testing, and pull request process.

## 🚀 **Roadmap**

### **Current: Aleo Code Sprint 4.0**
- **Goal**: Demonstrate DeFi on Aleo blockchain
- **Status**: MVP with fixed rate trading

### **Future**
- **Phase 1**: Privacy features and zero-knowledge proofs
- **Phase 2**: AMM implementation and dynamic pricing
- **Phase 3**: Cross-chain bridge and governance

## 📄 **License**

MIT License - see LICENSE file for details.

## 🙏 **Acknowledgments**

- **Arcanne Finance**: For architectural inspiration
- **Aleo Team**: For Leo language and blockchain
- **Community**: For feedback and testing

---

**WhisperWaffle MVP** - Demonstrating DeFi on Aleo for Code Sprint 4.0! 🚀🧇

*This MVP showcases core DeFi functionality with public token trading. Future versions will include full privacy features and advanced DeFi mechanics.*
