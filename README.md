
# 🧇 WhisperWaffle - Advanced Aleo DEX

**WhisperWaffle** is a cutting-edge decentralized exchange (DEX) built on the Aleo blockchain, featuring advanced DeFi functionality, privacy-preserving swaps, and a modern, intuitive user interface.

## 🚀 **MVP for Aleo Code Sprint 4.0**

### **Project Overview**
This is a **Minimum Viable Product (MVP)** built specifically for the **Aleo Code Sprint 4.0**, demonstrating core DeFi functionality on the Aleo blockchain. The MVP focuses on public token trading to showcase the platform's capabilities while maintaining simplicity for the sprint deadline.

### **MVP Features**
- **Public Token Trading**: Trade between wALEO and wUSDC tokens (public for sprint demo)
- **Basic AMM Mechanics**: Constant product formula with slippage protection
- **Liquidity Provision**: Add/remove liquidity from pools
- **Wrapped Token Infrastructure**: Native ALEO to wALEO conversion system
- **Role Management**: Basic MINTER_ROLE setup for token operations
- **Simple UI**: Clean, functional interface for sprint demonstration

### **Sprint Focus Areas**
- **Core Functionality**: Essential swap and liquidity features
- **Token Integration**: Proper use of `token_registry.aleo`
- **User Experience**: Intuitive interface for DeFi operations
- **Blockchain Integration**: Real Aleo testnet deployment

### **Current MVP Features**
- **Basic Wrapped Token Support**: wALEO and wUSDC for DeFi operations
- **Simple Role Management**: Basic MINTER_ROLE setup for token operations
- **Pool Management**: Create and manage single liquidity pool
- **Basic Swap Mechanics**: Constant product AMM with basic slippage protection
- **Fee Collection**: Simple swap fee collection (0.3%)
- **LP Token System**: Basic minting/burning of liquidity provider tokens

### **Future Enhancements (Post-Sprint)**
- **Privacy Features**: Zero-knowledge proof integration for private swaps
- **Advanced AMM**: Multiple pool types and algorithms
- **Cross-Chain Bridge**: Integration with other blockchains
- **Governance System**: DAO and token voting mechanisms
- **Advanced Analytics**: Professional trading tools and charts
- **Mobile Application**: Native mobile app development

## 🏗️ **Architecture Overview**

### **Smart Contracts (Leo)**
- **Main DEX Program**: `ww_swap_v13.aleo`
- **Wrapped Credits Program**: `ww_swap_wrapped_credits_v1.aleo`
- **Language**: Leo 3.1.0
- **Network**: Aleo Testnet Beta
- **Dependencies**: `credits.aleo`, `token_registry.aleo`

### **Core Functions**
- `create_pool_public()` - Initialize new liquidity pools
- `add_liquidity_public()` - Add tokens to existing pools
- `remove_liquidity_public()` - Remove tokens from pools
- `swap_public()` - Swap between wALEO and wUSDC
- `get_pool_info()` - Query pool information
- `get_user_liquidity_position()` - Get user's liquidity positions

### **Wrapped Credits Functions**
- `deposit_credits_public_signer()` - Convert native ALEO to wALEO
- `withdraw_credits_public_signer()` - Convert wALEO back to native ALEO

### **Data Structures**
- **PoolInfo**: Complete pool state with reserves, fees, and configuration
- **LiquidityPosition**: User's LP token holdings and timestamps
- **CollectedFee**: Protocol fee tracking and management

## 🎯 **MVP Scope & Limitations**

### **What This MVP Includes**
- **Basic DEX Functionality**: Core swap and liquidity features
- **Public Token Trading**: wALEO ↔ wUSDC swaps (public for demo)
- **Simple Pool Management**: Single pool with basic AMM
- **Wrapped Token Infrastructure**: ALEO ↔ wALEO conversion
- **Basic Role Management**: MINTER_ROLE setup for tokens
- **Functional UI**: Clean interface for sprint demonstration

### **MVP Limitations (By Design)**
- **Public Transactions**: No privacy features for sprint demo
- **Single Pool**: Limited to one trading pair
- **Basic AMM**: Simple constant product formula only
- **No Advanced Features**: Focused on core functionality
- **Testnet Only**: Not production-ready

### **Sprint Goals**
- **Demonstrate DeFi on Aleo**: Show core DEX capabilities
- **Token Integration**: Proper use of `token_registry.aleo`
- **User Experience**: Intuitive interface for DeFi operations
- **Blockchain Deployment**: Real testnet deployment
- **Code Quality**: Clean, maintainable Leo code

## 🎯 **Key Features**

### **Token Management (MVP)**
- **Wrapped ALEO (wALEO)**: ERC-20 style token representing ALEO
- **Wrapped USDC (wUSDC)**: Custom token for DeFi operations
- **Basic Role Management**: MINTER_ROLE setup for token operations
- **Token Approvals**: Secure token spending permissions
- **Public Transactions**: No privacy features for sprint demo

### **Liquidity Management**
- **Pool Creation**: Create new pools with wALEO/wUSDC pairs
- **Liquidity Provision**: Add/remove liquidity with slippage protection
- **LP Token System**: Earn rewards for providing liquidity
- **Multi-Pool Support**: Scale to multiple trading pairs

### **Trading & Swaps**
- **Constant Product AMM**: Uniswap-style automated market making
- **Slippage Protection**: Configurable minimum output amounts
- **Fee Collection**: 0.3% swap fee + 0.05% protocol fee
- **Real Token Transfers**: Actual blockchain transactions

### **User Experience**
- **Deposit/Withdraw**: Convert between native ALEO and wALEO
- **Token Approvals**: Secure permission system for token operations
- **Balance Tracking**: Real-time token balance monitoring
- **Transaction History**: Complete transaction tracking

## 🛠️ **Development Setup**

### **Prerequisites**
- Node.js 18+ 
- Leo CLI 3.1.0
- Aleo wallet (Leo Wallet recommended)
- Yarn package manager

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd WhisperWaffle

# Install dependencies
yarn install

# Build the Leo programs
cd program
leo build

cd ../wrapped_program
leo build

# Return to root and build frontend
cd ..
yarn build

# Start development server
yarn dev
```

### **Environment Configuration**
- **Network**: Testnet Beta (configurable for mainnet)
- **wALEO Token ID**: `68744147421264673966385360field`
- **wUSDC Token ID**: `42069187360666field`
- **Pool ID**: Fixed pool ID (1field) for initial deployment

## 🔧 **Configuration**

### **Program Constants**
```leo
const WRAPPED_ALEO_ID: field = 68744147421264673966385360field;
const TOKEN_ID: field = 42069187360666field;
const SWAP_FEE: u16 = 30u16;                    // 0.3%
const PROTOCOL_FEE: u16 = 5u16;                 // 0.05%
const MIN_LIQUIDITY: u128 = 1000000u128;        // Minimum pool size
const EXCHANGE_RATE: u128 = 4u128;              // 4 wALEO = 1 wUSDC
```

### **Frontend Configuration**
- **Main Program ID**: `ww_swap_v13.aleo`
- **Wrapped Program ID**: `ww_swap_wrapped_credits_v1.aleo`
- **Network**: Testnet Beta
- **RPC Endpoints**: Configurable for different networks

## 📱 **User Interface**

### **Main Pages**
- **Home**: Project overview and navigation
- **User Dashboard**: Swap interface, liquidity management, and portfolio
- **Token Management**: Token creation, minting, and role management
- **Token Unlock**: Token unlocking and role management

### **Dashboard Features**
- **Swap Interface**: Trade between wALEO and wUSDC
- **Liquidity Management**: Add/remove liquidity from pools
- **Deposit/Withdraw**: Convert between native ALEO and wALEO
- **Token Approvals**: Manage token spending permissions
- **Balance Tracking**: Real-time token balances

### **Features**
- **Responsive Design**: Mobile-first approach
- **Modern UI**: Clean, intuitive interface with cyberpunk theme
- **Real-time Updates**: Live pool data and balances
- **Transaction Tracking**: Complete transaction history

## 🚀 **Deployment**

### **Testnet Deployment**
```bash
# Deploy the main DEX program
cd program
leo deploy

# Deploy the wrapped credits program
cd ../wrapped_program
leo deploy

# Update frontend configuration
# Set PROGRAM_ID to deployed addresses
```

### **Mainnet Preparation**
- Update token IDs to mainnet addresses
- Configure mainnet RPC endpoints
- Update fee structures if needed
- Test thoroughly on testnet first

## 🔒 **Security & Privacy (MVP)**

### **Current Security Features**
- **Input Validation**: Comprehensive parameter checking
- **Slippage Protection**: Configurable minimum output amounts
- **Fee Management**: Transparent fee collection
- **Access Control**: Basic role-based permission management
- **Token Approvals**: Secure token spending permissions

### **Privacy Features (Future Enhancement)**
- **Zero-Knowledge Proofs**: Complete transaction privacy (post-sprint)
- **Hidden Balances**: Concealed user balances (post-sprint)
- **Anonymous Trading**: Hidden trading patterns (post-sprint)
- **Private Swaps**: Encrypted transaction data (post-sprint)

### **MVP Privacy Note**
This MVP uses **public transactions** to demonstrate core DeFi functionality for the Aleo Code Sprint 4.0. Privacy features will be implemented in future versions after the sprint.

## 🔒 **Security Features**

### **Smart Contract Security**
- **Input Validation**: Comprehensive parameter checking
- **Slippage Protection**: Configurable minimum outputs
- **Fee Management**: Transparent and controlled fee collection
- **Access Control**: Role-based permission management
- **Token Approvals**: Secure token spending permissions

### **Frontend Security**
- **Wallet Integration**: Secure wallet connection
- **Transaction Validation**: Client-side input validation
- **Error Handling**: Comprehensive error messages
- **User Feedback**: Clear transaction status updates

## 📊 **Performance & Scalability**

### **Optimizations**
- **Efficient Data Structures**: Optimized for Aleo blockchain
- **Minimal Gas Usage**: Cost-effective transactions
- **Scalable Architecture**: Support for multiple pools
- **Real-time Updates**: Efficient data fetching

### **Monitoring**
- **Transaction Tracking**: Complete transaction history
- **Pool Analytics**: Real-time pool statistics
- **User Analytics**: Portfolio and trading metrics
- **Performance Metrics**: Gas usage and transaction times

## 🤝 **Contributing**

We welcome contributions! Please see our contributing guidelines for:
- Code standards and style
- Testing requirements
- Pull request process
- Community guidelines

## 🚀 **Sprint Timeline & Future Roadmap**

### **Aleo Code Sprint 4.0 (Current)**
- **Duration**: Sprint period (typically 2-4 weeks)
- **Focus**: Core DEX functionality demonstration
- **Deliverables**: Working MVP with public token trading
- **Goal**: Show DeFi capabilities on Aleo blockchain

### **Post-Sprint Development**
- **Phase 1**: Privacy features and zero-knowledge proofs
- **Phase 2**: Advanced AMM algorithms and multiple pools
- **Phase 3**: Cross-chain bridge and institutional features
- **Phase 4**: Governance system and DAO implementation

### **Long-term Vision**
- **Privacy-First DeFi**: Complete zero-knowledge proof integration
- **Multi-Chain Ecosystem**: Cross-chain interoperability
- **Institutional Adoption**: Professional DeFi tools
- **Global Expansion**: Worldwide DeFi accessibility

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 **Acknowledgments**

- **Arcanne Finance**: For inspiration and architectural patterns
- **Aleo Team**: For the amazing Leo language and blockchain
- **Community**: For feedback and testing support

## 📞 **Support**

- **Documentation**: Comprehensive guides and examples
- **Issues**: GitHub issue tracking
- **Discussions**: Community forum and discussions
- **Discord**: Real-time support and updates

---

**WhisperWaffle MVP** - Demonstrating DeFi on Aleo for Code Sprint 4.0! 🚀🧇

*This MVP showcases core DeFi functionality with public token trading. Future versions will include full privacy features and advanced DeFi mechanics.*
