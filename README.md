
# 🧇 WhisperWaffle - Advanced Aleo DEX

A sophisticated, privacy-first decentralized exchange (DEX) built on Aleo, featuring advanced swap mechanics, liquidity provision, and enhanced safety features.

## 🚀 Features

### ✅ **Core DEX Functionality**
- **Automated Market Maker (AMM)** with constant product formula
- **Liquidity Provision** with LP token rewards
- **Multi-token Swaps** (ALEO ↔ USDC)
- **Private & Public Transfers** for enhanced privacy

### ✅ **Enhanced Safety Features (v3)**
- **Slippage Protection** for all operations
- **Input Validation** and bounds checking
- **Overflow/Underflow Protection**
- **Pool State Verification** before operations
- **Minimum Liquidity Requirements**

### ✅ **Technical Stack**
- **Leo Program**: `ww_swap_v3.aleo` with async transitions
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Wallet Integration**: Leo Wallet with full Aleo support
- **Network**: TestnetBeta (easily configurable for mainnet)

---

## 🏗️ Architecture

### **Smart Contract (Leo)**
```leo
program ww_swap_v3.aleo {
    // Core structures
    struct Pair { reserve_aleo, reserve_usdc, total_liquidity }
    struct LiquidityPosition { aleo_amount, usdc_amount, lp_tokens, timestamp }
    
    // Key functions
    async transition initialise_pool(aleo_in, usdc_in)
    async transition add_liquidity(aleo_in, usdc_in, ra, rb, min_lp_tokens)
    async transition remove_liquidity(lp_tokens, ra, rb, min_aleo_out, min_usdc_out)
    async transition swap_public_for_public(aleo_in, ra, rb, min_out)
    async transition swap_public_for_private(aleo_in, ra, rb, min_out, recipient)
    async transition swap_private_for_private(credit_in, ra, rb, min_out, recipient)
}
```

### **Frontend Integration**
- **Program ID**: `ww_swap_v3.aleo`
- **Network**: `WalletAdapterNetwork.TestnetBeta`
- **RPC**: `https://testnetbeta.aleorpc.com`

---

## 🚀 Quick Start

### **1. Clone & Install**
```bash
git clone https://github.com/mikenike360/WhisperWaffle.git
cd WhisperWaffle
yarn install
```

### **2. Build Leo Program**
```bash
cd program
leo build
```

### **3. Start Development Server**
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Wallet Setup

1. **Install Leo Wallet** browser extension
2. **Connect Wallet** to the application
3. **Switch to TestnetBeta** network
4. **Import/Generate** testnet account

---

## 💰 Using WhisperWaffle

### **Pool Initialization**
```typescript
import { initializePool } from '@/utils/initializePool';

const txId = await initializePool(
  wallet,
  publicKey,
  1000,  // ALEO amount (microcredits)
  1500,  // USDC amount
  setTxStatus
);
```

### **Adding Liquidity**
```typescript
import { addLiquidity } from '@/utils/addLiquidity';

const txId = await addLiquidity(
  wallet,
  publicKey,
  100,   // ALEO to add
  150,   // USDC to add
  50,    // Minimum LP tokens to receive
  setTxStatus
);
```

### **Swapping Tokens**
```typescript
import { swapPublicForPublic } from '@/utils/swapPublicForPublic';

const txId = await swapPublicForPublic(
  wallet,
  publicKey,
  1.0,   // ALEO amount
  1000,  // Current ALEO reserve
  1500,  // Current USDC reserve
  1.4,   // Minimum USDC to receive
  setTxStatus
);
```

---

## 🛡️ Safety Features

### **Slippage Protection**
- **Add Liquidity**: `min_lp_tokens` parameter
- **Remove Liquidity**: `min_aleo_out` and `min_usdc_out` parameters
- **Swaps**: `min_out` parameter for all swap functions

### **Input Validation**
- All amounts must be positive
- Pool reserves verified before operations
- Output bounds checking (`out_amt < rb`)

### **State Verification**
- Pool state consistency checks
- LP token validation
- Reserve balance verification

---

## 🔄 Network Configuration

### **Testnet (Default)**
```typescript
// src/types/index.ts
export const CURRENT_NETWORK = WalletAdapterNetwork.TestnetBeta;
export const CURRENT_RPC_URL = "https://testnetbeta.aleorpc.com";
```

### **Mainnet**
```typescript
// src/types/index.ts
export const CURRENT_NETWORK = WalletAdapterNetwork.MainnetBeta;
export const CURRENT_RPC_URL = "https://api.aleo.org";
```

---

## 📁 Project Structure

```
WhisperWaffle/
├── program/                 # Leo smart contract
│   ├── src/main.leo       # Main DEX logic
│   └── program.json       # Program configuration
├── src/
│   ├── components/         # React components
│   │   ├── aleo/          # Aleo-specific components
│   │   ├── ui/            # Reusable UI components
│   │   └── icons/         # Icon components
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Page layouts
│   ├── pages/              # Next.js routes
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
│       ├── addLiquidity.ts # Liquidity management
│       ├── swapCalculator.ts # Swap calculations
│       └── ...             # Other utilities
├── docs/                   # Documentation
└── public/                 # Static assets
```

---

## 🧪 Testing

### **Local Development**
```bash
# Build Leo program
cd program && leo build

# Run frontend tests
yarn test

# Start development server
yarn dev
```

### **Program Verification**
- **Checksum**: `[174u8, 180u8, 217u8, 164u8, 183u8, 248u8, 205u8, 41u8, 193u8, 30u8, 42u8, 236u8, 64u8, 69u8, 95u8, 16u8, 199u8, 156u8, 47u8, 137u8, 120u8, 51u8, 232u8, 177u8, 137u8, 182u8, 217u8, 251u8, 237u8, 28u8, 247u8, 96u8]`
- **Status**: ✅ Successfully compiled
- **Version**: v3.0.0

---

## 🔧 Development

### **Adding New Features**
1. **Leo Program**: Add new transitions in `program/src/main.leo`
2. **Frontend**: Create corresponding utility functions in `src/utils/`
3. **Types**: Update TypeScript definitions in `src/types/`
4. **Documentation**: Update relevant docs

### **Testing Changes**
```bash
# Test Leo program changes
cd program && leo build

# Test frontend integration
yarn build
yarn test
```

---

## 📚 Documentation

- **[SWAP_UTILITIES.md](docs/SWAP_UTILITIES.md)** - Detailed swap and liquidity utilities
- **[POOL_PAGE.md](docs/POOL_PAGE.md)** - Pool management documentation
- **[DEPLOY_V3.md](DEPLOY_V3.md)** - Deployment guide for v3

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Built by [@mikenike360](https://github.com/mikenike360) from [VenomLabs](https://venomlabs.xyz)

---

## 🌟 Acknowledgments

- **Aleo Team** for the privacy-first blockchain platform
- **Leo Language** for smart contract development
- **Next.js Team** for the excellent React framework
- **Open Source Community** for continuous improvements

---

*WhisperWaffle - Where privacy meets DeFi* 🧇✨
