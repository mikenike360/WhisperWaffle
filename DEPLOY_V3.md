# Deploy WhisperWaffle Swap v3

## Overview

This guide will help you deploy the new v3 Leo program that supports full liquidity management.

## What's New in v3

### ✅ **New Functions:**
- `add_liquidity` - Add liquidity to existing pools
- `remove_liquidity` - Remove liquidity and get back tokens
- `get_user_position` - View user's liquidity position
- `get_pool_state` - Get pool state with total liquidity tracking

### 🔧 **Enhanced Features:**
- LP token tracking for liquidity providers
- Position management for users
- Support for multiple liquidity additions
- Proper liquidity ratio calculations

## Deployment Steps

### 1. **Prepare the v3 Program**

```bash
# Navigate to the v3 program directory
cd program-v3

# Create .env file with your credentials
echo "NETWORK=testnet" > .env
echo "ENDPOINT=https://testnetbeta.aleorpc.com" >> .env
echo "PRIVATE_KEY=YOUR_ACTUAL_PRIVATE_KEY" >> .env
```

### 2. **Build the Program**

```bash
# Build the Leo program
leo build
```

### 3. **Deploy the Program**

```bash
# Deploy to testnet
leo deploy
```

### 4. **Update Frontend Configuration**

After deployment, update these files:

#### Update `src/utils/addLiquidity.ts`:
```typescript
// Change this line to your deployed program ID
export const PROGRAM_ID_V3 = 'YOUR_DEPLOYED_PROGRAM_ID.aleo';
```

#### Update `src/types/index.ts`:
```typescript
// Add the new program ID
export const PROGRAM_ID_V3 = 'YOUR_DEPLOYED_PROGRAM_ID.aleo';
```

### 5. **Test the New Functions**

1. **Test Add Liquidity**: Use the pool page to add liquidity
2. **Test Remove Liquidity**: Remove some liquidity to verify it works
3. **Test Position Tracking**: Check that user positions are recorded

## Migration from v2

### **What Stays the Same:**
- All existing swap functions work identically
- Pool state structure is compatible
- User balances and allowances remain the same

### **What's New:**
- Users can now add liquidity to existing pools
- LP token system tracks liquidity provider positions
- Remove liquidity functionality
- Enhanced pool state tracking

## Testing Checklist

- [ ] Program builds successfully
- [ ] Program deploys to testnet
- [ ] Add liquidity works for new users
- [ ] Add liquidity works for existing users
- [ ] Remove liquidity works correctly
- [ ] User positions are tracked properly
- [ ] Pool state updates correctly
- [ ] All existing swap functions still work

## Troubleshooting

### **Build Errors:**
- Ensure Leo version 3.1.0+ is installed
- Check that all dependencies are available
- Verify .env file is properly configured

### **Deployment Errors:**
- Ensure sufficient ALEO balance for deployment
- Check network connectivity to testnet
- Verify private key is correct

### **Runtime Errors:**
- Check program ID is correctly set in frontend
- Verify pool state is being fetched correctly
- Ensure transaction parameters match function signatures

## Next Steps After Deployment

1. **Update Frontend**: Point to new program ID
2. **Test All Functions**: Verify everything works as expected
3. **User Onboarding**: Educate users about new liquidity features
4. **Monitor Performance**: Watch for any issues in production

## Support

If you encounter issues during deployment:
1. Check the Leo compiler output for errors
2. Verify your .env configuration
3. Ensure you have sufficient testnet ALEO
4. Check the Aleo testnet status

The v3 program represents a significant upgrade to your AMM, enabling users to fully participate in liquidity provision and management!
