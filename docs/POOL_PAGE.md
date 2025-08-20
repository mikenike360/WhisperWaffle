# WhisperWaffle Pool Page

## Overview

The pool page (`/pool`) allows users to view pool statistics and add liquidity to the ALEO/USDC swap pool. This page integrates with your deployed `ww_swap_v5.aleo` Leo program.

## Features

### ✅ **Currently Working:**

1. **Pool Statistics Display**: Shows real-time pool data including:
   - ALEO reserves
   - USDC reserves  
   - Total pool value
   - Pool fee (0.3%)

2. **Pool Status Indicator**: Shows whether the pool can accept new liquidity:
   - **Green**: Pool is empty and ready for initialization
   - **Yellow**: Pool already has liquidity

3. **Liquidity Addition Form**: 
   - Input fields for ALEO and USDC amounts
   - Automatic calculation of optimal ratios
   - Balance checking
   - Pool share preview

4. **Real Blockchain Integration**:
   - Fetches live pool data from Aleo testnet
   - Uses real user balances from credits.aleo
   - Integrates with Leo program functions

### ⚠️ **Current Limitations:**

1. **Pool Initialization Only**: The current Leo program only supports initializing an empty pool once
2. **No Add Liquidity Function**: Cannot add liquidity to an existing pool without program updates
3. **Simulated Transactions**: Adding liquidity to existing pools is currently simulated

## Technical Implementation

### Files Created:

- `src/pages/pool.tsx` - Main pool page component
- `src/utils/addLiquidity.ts` - Liquidity management utilities
- Navigation links added to main layout and dashboard

### Key Components:

1. **PoolStats**: Displays current pool reserves and statistics
2. **AddLiquidityForm**: Form for inputting liquidity amounts
3. **Pool Status**: Shows pool readiness for new liquidity
4. **Transaction Status**: Real-time feedback during operations

## To Enable Full Liquidity Management

### 1. **Add to Leo Program** (`program/src/main.aleo`):

```leo
// Add this function to your Leo program
async transition add_liquidity(
    public aleo_in: u64,
    public usdc_in: u128,
    public ra: u128,
    public rb: u128
) -> Future {
    let amount_aleo: u128 = aleo_in as u128;
    let amount_usdc: u128 = usdc_in;
    
    // Verify current pool state
    let current: Pair = Mapping::get_or_use(
        pool_state,
        0u8,
        Pair { reserve_aleo: 0u128, reserve_usdc: 0u128 }
    );
    assert(current.reserve_aleo == ra && current.reserve_usdc == rb);
    
    // Calculate new reserves
    let new_ra: u128 = ra + amount_aleo;
    let new_rb: u128 = rb + amount_usdc;
    
    // Update pool state
    return async {
        Mapping::set(
            pool_state,
            0u8,
            Pair { reserve_aleo: new_ra, reserve_usdc: new_rb }
        );
    };
}
```

### 2. **Update Utilities**:

- Replace the simulated `addLiquidity` function with real Leo program calls
- Add proper transaction handling and confirmation
- Implement LP token minting (if desired)

### 3. **Add Remove Liquidity**:

- Create `remove_liquidity` function in Leo program
- Add UI for removing liquidity
- Handle impermanent loss calculations

## Usage

### For Users:

1. **Navigate to Pool**: Click the "💧 Pool" button in the header
2. **View Pool Stats**: See current reserves and pool value
3. **Add Liquidity**: 
   - Enter ALEO amount (USDC amount auto-calculates)
   - Or enter USDC amount (ALEO amount auto-calculates)
   - Click "Add Liquidity"
4. **Monitor Status**: Watch transaction progress and confirmation

### For Developers:

1. **Test Pool Page**: Navigate to `/pool` to see the interface
2. **Check Pool Status**: Verify the pool can/cannot accept liquidity
3. **Test Liquidity Addition**: Try adding liquidity (will work for empty pools)
4. **Monitor Console**: Check for any errors or warnings

## Navigation

- **Header**: "💧 Pool" button in main navigation
- **Dashboard**: "💧 Pool" link in swap interface
- **Pool Page**: "← Back to Swap" link to return

## Future Enhancements

1. **LP Token System**: Mint/burn LP tokens for liquidity providers
2. **Impermanent Loss Calculator**: Show potential losses from price changes
3. **Liquidity Mining**: Reward users for providing liquidity
4. **Multiple Pool Support**: Handle different token pairs
5. **Advanced Analytics**: Charts, volume, and performance metrics

## Testing

The pool page is ready for testing with your deployed Leo program. Users can:

- View real pool data from the blockchain
- Initialize the pool if it's empty
- See the current pool status and limitations
- Understand what needs to be implemented for full functionality

## Conclusion

The pool page provides a solid foundation for liquidity management. The main missing piece is the `add_liquidity` function in your Leo program. Once that's implemented, users will be able to fully participate in providing liquidity to your AMM.
