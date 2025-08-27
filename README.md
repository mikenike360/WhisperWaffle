
# 🧇 WhisperWaffle - Advanced Aleo DEX

**WhisperWaffle** is a cutting-edge decentralized exchange (DEX) built on the Aleo blockchain, featuring advanced DeFi functionality, privacy-preserving swaps, and a modern, intuitive user interface.

## 🚀 **What's New in v6**

### **Major Architecture Improvements**
- **Complete Program Rewrite**: Following Arcanne Finance patterns for professional DeFi functionality
- **Proper Token Registry Integration**: Real token transfers using `token_registry.aleo`
- **LP Token Management**: Proper minting/burning of liquidity provider tokens
- **Fee Management**: Swap fees and protocol fee collection
- **Pool Creation System**: Dedicated pool creation with unique pool IDs
- **Enhanced Security**: Slippage protection and proper validation

### **Technical Features**
- **Multiple Pool Support**: Each pool has a unique ID for scalability
- **Professional DeFi Structure**: Follows industry best practices
- **Real Blockchain Integration**: No more mock/simulation data
- **Proper Error Handling**: Comprehensive validation and error messages

## 🏗️ **Architecture Overview**

### **Smart Contract (Leo)**
- **Program**: `ww_swap_v6.aleo`
- **Language**: Leo 3.1.0
- **Network**: Aleo Testnet Beta
- **Dependencies**: `credits.aleo`, `token_registry.aleo`

### **Core Functions**
- `create_pool()` - Initialize new liquidity pools
- `add_liquidity()` - Add tokens to existing pools
- `remove_liquidity()` - Remove tokens from pools
- `swap_aleo_for_token()` - Swap ALEO for custom tokens
- `get_pool_info()` - Query pool information
- `get_user_position()` - Get user's liquidity positions

### **Data Structures**
- **PoolInfo**: Complete pool state with reserves, fees, and configuration
- **LiquidityPosition**: User's LP token holdings and timestamps
- **CollectedFee**: Protocol fee tracking and management

## 🎯 **Key Features**

### **Liquidity Management**
- **Pool Creation**: Create new pools with custom token pairs
- **Liquidity Provision**: Add/remove liquidity with slippage protection
- **LP Token System**: Earn rewards for providing liquidity
- **Multi-Pool Support**: Scale to multiple trading pairs

### **Trading & Swaps**
- **Constant Product AMM**: Uniswap-style automated market making
- **Slippage Protection**: Configurable minimum output amounts
- **Fee Collection**: 0.3% swap fee + 0.05% protocol fee
- **Real Token Transfers**: Actual blockchain transactions

### **Admin Functions**
- **Pool Management**: Create and configure new pools
- **Token Registration**: Register new tokens on Aleo
- **Token Minting**: Mint additional tokens for distribution
- **Fee Management**: Configure and collect protocol fees

## 🛠️ **Development Setup**

### **Prerequisites**
- Node.js 18+ 
- Leo CLI 3.1.0
- Aleo wallet (Leo Wallet recommended)

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd WhisperWaffle

# Install dependencies
npm install

# Build the Leo program
cd program
leo build

# Return to root and build frontend
cd ..
npm run build

# Start development server
npm run dev
```

### **Environment Configuration**
- **Network**: Testnet Beta (configurable for mainnet)
- **Token ID**: Configurable for testnet vs mainnet
- **Pool ID**: Fixed pool ID (1field) for initial deployment

## 🔧 **Configuration**

### **Program Constants**
```leo
const TOKEN_ID: field = 42069187360field; // Change for mainnet
const SWAP_FEE: u16 = 30u16;                    // 0.3%
const PROTOCOL_FEE: u16 = 5u16;                 // 0.05%
const MIN_LIQUIDITY: u128 = 1000000u128;        // Minimum pool size
```

### **Frontend Configuration**
- **Program ID**: `ww_swap_v6.aleo`
- **Network**: Testnet Beta
- **RPC Endpoints**: Configurable for different networks

## 📱 **User Interface**

### **Main Pages**
- **Home**: Project overview and navigation
- **Dashboard**: Swap interface and portfolio management
- **Pool**: Liquidity management and pool information
- **Admin**: Administrative functions and pool creation

### **Features**
- **Responsive Design**: Mobile-first approach
- **Modern UI**: Clean, intuitive interface
- **Real-time Updates**: Live pool data and balances
- **Transaction Tracking**: Complete transaction history

## 🚀 **Deployment**

### **Testnet Deployment**
```bash
# Deploy the Leo program
cd program
leo deploy

# Update frontend configuration
# Set PROGRAM_ID to deployed address
```

### **Mainnet Preparation**
- Update `TOKEN_ID` to vUSDC address
- Configure mainnet RPC endpoints
- Update fee structures if needed
- Test thoroughly on testnet first

## 🔒 **Security Features**

### **Smart Contract Security**
- **Input Validation**: Comprehensive parameter checking
- **Slippage Protection**: Configurable minimum outputs
- **Fee Management**: Transparent and controlled fee collection
- **Access Control**: Proper permission management

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

**WhisperWaffle v6** - Building the future of decentralized finance on Aleo! 🚀🧇
