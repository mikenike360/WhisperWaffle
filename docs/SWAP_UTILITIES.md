# WhisperWaffle Swap Utilities

This document describes the utility functions created to interact with the `ww_swap_v2.aleo` Leo program.

## Overview

The swap utilities provide TypeScript functions that wrap the Leo program functions for:
- Pool initialization
- ALEO to USDC swaps (public and private)
- Swap calculations and slippage protection

## Available Functions

### 1. Pool Initialization

#### `initializePool`
Initializes the swap pool with starting reserves of ALEO and USDC.

```typescript
import { initializePool } from '@/utils';

const txId = await initializePool(
  wallet,           // LeoWalletAdapter instance
  publicKey,        // User's public key
  aleoAmount,       // ALEO amount (e.g., 1.0 for 1 ALEO)
  usdcAmount,       // USDC amount (e.g., 1.0 for 1 USDC)
  setTxStatus       // Status update function
);
```

### 2. Swap Functions

#### `swapPublicForPrivate`
Swaps public ALEO for private USDC tokens.

```typescript
import { swapPublicForPrivate } from '@/utils';

const txId = await swapPublicForPrivate(
  wallet,           // LeoWalletAdapter instance
  publicKey,        // User's public key
  aleoAmount,       // ALEO amount to swap
  ra,               // Current ALEO reserve
  rb,               // Current USDC reserve
  minOut,           // Minimum USDC to receive
  recipient,        // Recipient address
  setTxStatus       // Status update function
);
```

#### `swapPrivateForPrivate`
Swaps private credits for private USDC tokens.

```typescript
import { swapPrivateForPrivate } from '@/utils';

const txId = await swapPrivateForPrivate(
  wallet,           // LeoWalletAdapter instance
  publicKey,        // User's public key
  creditRecord,     // Private credit record
  ra,               // Current ALEO reserve
  rb,               // Current USDC reserve
  minOut,           // Minimum USDC to receive
  recipient,        // Recipient address
  setTxStatus       // Status update function
);
```

#### `swapPublicForPublic`
Swaps public ALEO for public USDC tokens.

```typescript
import { swapPublicForPublic } from '@/utils';

const txId = await swapPublicForPublic(
  wallet,           // LeoWalletAdapter instance
  publicKey,        // User's public key
  aleoAmount,       // ALEO amount to swap
  ra,               // Current ALEO reserve
  rb,               // Current USDC reserve
  minOut,           // Minimum USDC to receive
  setTxStatus       // Status update function
);
```

### 3. Calculation Functions

#### `calculateSwapOutput`
Calculates the expected output amount for a swap.

```typescript
import { calculateSwapOutput } from '@/utils';

const expectedOutput = calculateSwapOutput(
  amountIn,         // Input amount in microcredits
  ra,               // Current ALEO reserve
  rb                // Current USDC reserve
);
```

#### `calculateMinOutput`
Calculates minimum output based on slippage tolerance.

```typescript
import { calculateMinOutput } from '@/utils';

const minOut = calculateMinOutput(
  expectedOutput,   // Expected output amount
  slippageTolerance // Slippage tolerance (e.g., 0.5 for 0.5%)
);
```

#### `calculatePriceImpact`
Calculates the price impact of a swap.

```typescript
import { calculatePriceImpact } from '@/utils';

const priceImpact = calculatePriceImpact(
  amountIn,         // Input amount
  ra                // Current ALEO reserve
);
```

#### `calculateRequiredInput`
Calculates required input for a desired output (reverse swap).

```typescript
import { calculateRequiredInput } from '@/utils';

const requiredInput = calculateRequiredInput(
  desiredOutput,    // Desired output amount
  ra,               // Current ALEO reserve
  rb                // Current USDC reserve
);
```

## Usage Example

Here's a complete example of how to use these utilities:

```typescript
import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import {
  initializePool,
  swapPublicForPrivate,
  calculateSwapOutput,
  calculateMinOutput,
} from '@/utils';

export const SwapComponent = () => {
  const { wallet, publicKey } = useWallet();
  const [status, setStatus] = useState<string | null>(null);

  const handleSwap = async () => {
    if (!wallet || !publicKey) return;

    try {
      // Calculate expected output
      const expectedOutput = calculateSwapOutput(1000000, 1000000000, 1000000);
      const minOut = calculateMinOutput(expectedOutput, 0.5);

      // Perform swap
      const txId = await swapPublicForPrivate(
        wallet.adapter,
        publicKey.toString(),
        1.0, // 1 ALEO
        1000000000, // Current ALEO reserve
        1000000,    // Current USDC reserve
        minOut,
        publicKey.toString(),
        setStatus
      );

      console.log('Swap completed:', txId);
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSwap}>Swap ALEO for USDC</button>
      {status && <p>{status}</p>}
    </div>
  );
};
```

## Important Notes

1. **Amount Formatting**: ALEO amounts are automatically converted to microcredits (multiplied by 1,000,000).

2. **Reserve Updates**: The pool reserves (`ra` and `rb`) need to be kept up-to-date. Consider implementing a way to fetch current reserves from the blockchain.

3. **Slippage Protection**: Always use `calculateMinOutput` to set slippage protection for your swaps.

4. **Error Handling**: All functions include proper error handling and transaction status updates.

5. **Network Configuration**: The utilities use the network configuration from `@/types` (currently set to TestnetBeta).

## Constants

- `PROGRAM_ID`: `'ww_swap_v3.aleo'`
- `CURRENT_NETWORK`: `WalletAdapterNetwork.TestnetBeta`
- `CURRENT_RPC_URL`: `"https://testnetbeta.aleorpc.com"`

## Enhanced Safety Features (v3)

The v3 program includes several safety improvements:

1. **Slippage Protection for LP Operations**: 
   - `add_liquidity` now requires `min_lp_tokens` parameter
   - `remove_liquidity` now requires `min_aleo_out` and `min_usdc_out` parameters

2. **Additional Safety Checks**:
   - Input amount validation (`amount_in > 0`)
   - Output amount bounds checking (`out_amt < rb`)
   - Positive LP token minting validation

3. **Enhanced Parameter Validation**:
   - All swap functions validate input amounts
   - Pool state verification before operations
   - Minimum liquidity requirements for pool initialization

## Dependencies

These utilities require the following packages:
- `@demox-labs/aleo-wallet-adapter-base`
- `@demox-labs/aleo-wallet-adapter-leo`
- `@demox-labs/aleo-wallet-adapter-react`

Make sure these are properly installed and configured in your project.
