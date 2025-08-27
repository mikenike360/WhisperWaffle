# Custom Token Configuration Guide

## Current Setup (Testnet)
Your WhisperWaffle DEX is currently configured to use your custom token `42069187360field` instead of USDC for testing purposes.

### What's Been Updated:
- ✅ **Balance Display**: Shows "Custom Token" instead of "USDC"
- ✅ **Pool Info**: Displays "Custom Token Reserve" 
- ✅ **Admin Forms**: Labels show "Custom Token Amount"
- ✅ **Swap Interface**: Token name shows "Custom Token (Test)"
- ✅ **Mock Balance**: Returns your minted 1001 tokens

### Files Modified:
- `src/utils/balanceFetcher.ts` - Added `fetchCustomTokenBalance()` function
- `src/components/dashboard/BalancesTab.tsx` - Updated labels
- `src/pages/admin.tsx` - Updated form labels and pool info
- `src/components/dashboard/PoolTab.tsx` - Updated reserve labels
- `src/components/dashboard/SwapTab.tsx` - Updated token names

## Switching to Real USDC (Mainnet)

### Step 1: Update Balance Fetcher
In `src/utils/balanceFetcher.ts`, change:
```typescript
// From (Testnet)
const usdcBalance = await fetchCustomTokenBalance(publicKey);

// To (Mainnet)
const usdcBalance = await fetchTokenBalance('usdc.aleo', publicKey, 'USDC');
```

### Step 2: Update UI Labels
Change all "Custom Token" references back to "USDC" in:
- BalancesTab.tsx
- admin.tsx  
- PoolTab.tsx
- SwapTab.tsx

### Step 3: Update Leo Program
In `program/src/main.leo`, change:
```leo
// From (Testnet)
const TOKEN_ID: field = 42069187360field;

// To (Mainnet)
const TOKEN_ID: field = [ACTUAL_VUSDC_TOKEN_ID];
```

### Step 4: Deploy and Test
1. Build the updated Leo program
2. Deploy to mainnet
3. Update frontend to use mainnet network
4. Test with real USDC

## Benefits of This Approach:
✅ **Easy Testing**: Use your custom token to test full functionality  
✅ **No USDC Needed**: Test without acquiring testnet USDC  
✅ **Simple Switch**: Just change a few constants when ready  
✅ **Same Interface**: All UI and logic remains identical  
✅ **Real Data**: Test with actual blockchain transactions  

## Current Status:
- **🟢 Testnet**: Using custom token `42069187360field`
- **🔵 Mainnet**: Ready to switch to real vUSDC
- **🧪 Testing**: Full DEX functionality available for testing
- **🚀 Production**: Easy transition when ready
