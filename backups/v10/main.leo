import credits.aleo;
import token_registry.aleo;

program ww_swap_v10.aleo {
    // Token ID - configurable for testnet vs mainnet
    // Testnet: Custom token ID for WhisperWaffle (your minted token)
    // Mainnet: vUSDC token ID
    const TOKEN_ID: field = 42069187360field; // Change this to vUSDC ID on mainnet

    // Pool configuration
    const SWAP_FEE: u16 = 30u16; // 0.3% swap fee (30 basis points)
    const PROTOCOL_FEE: u16 = 5u16; // 0.05% protocol fee (5 basis points)
    const MIN_LIQUIDITY: u128 = 1000000u128; // Minimum liquidity to prevent division by zero
    
    // Fixed exchange rate for MVP
    const EXCHANGE_RATE: u128 = 4u128; // 4 ALEO = 1 custom token

    // Data structures
    struct PoolInfo {
        id: field,
        token1_id: field, // ALEO token ID
        token2_id: field, // Custom token ID
        reserve1: u128,   // ALEO reserve
        reserve2: u128,   // Custom token reserve
        lp_total_supply: u128,
        swap_fee: u16,
        protocol_fee: u16,
        pool_type: u8, // 0 = constant product (AMM), 1 = stable
    }

    struct LiquidityPosition {
        user_address: address,
        pool_id: field,
        lp_tokens: u128,
        timestamp: u64,
    }

    struct CollectedFee {
        protocol_in_fee: u128,
        protocol_out_fee: u128,
    }

    // Global state mappings
    mapping pools: field => PoolInfo;
    mapping liquidity_positions: field => LiquidityPosition;
    mapping protocol_fees: field => u128; // Accumulated protocol fees per token

    // This constructor is required for all Leo programs
    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic
    }

    // Create a new liquidity pool
    async transition create_pool(
        public token1_amount: u128, // ALEO amount
        public token2_amount: u128, // Custom token amount
        public min_lp_tokens: u128
    ) -> Future {
        // Ensure positive amounts
        assert(token1_amount > 0u128 && token2_amount > 0u128);
        
        // Ensure minimum liquidity
        assert(token1_amount + token2_amount >= MIN_LIQUIDITY);
        
        // Get caller address outside async block
        let caller_address: address = self.caller;
        
        return async {
            // Generate unique pool ID (hash of token IDs and timestamp)
            let pool_id: field = 1field; // Use fixed pool ID for now
            
            // Calculate initial LP tokens (simple sum for now)
            let lp_tokens: u128 = token1_amount + token2_amount;
            
            // Ensure minimum LP tokens
            assert(lp_tokens >= min_lp_tokens);
            
            // Create pool info
            let pool_info: PoolInfo = PoolInfo {
                id: pool_id,
                token1_id: 0field, // ALEO token ID (0 for credits)
                token2_id: TOKEN_ID,
                reserve1: token1_amount,
                reserve2: token2_amount,
                lp_total_supply: lp_tokens,
                swap_fee: SWAP_FEE,
                protocol_fee: PROTOCOL_FEE,
                pool_type: 0u8, // Constant product AMM
            };
            
            // Store pool info
            Mapping::set(pools, pool_id, pool_info);
            
            // Create initial liquidity position for creator
            let position: LiquidityPosition = LiquidityPosition {
                user_address: caller_address,
                pool_id: pool_id,
                lp_tokens: lp_tokens,
                timestamp: 0u64, // Use 0 for now since we can't access block_height
            };
            
            // Store liquidity position
            let position_key: field = (caller_address as field) + pool_id;
            Mapping::set(liquidity_positions, position_key, position);
        };
    }

    // Add liquidity to an existing pool
    async transition add_liquidity(
        public pool_id: field,
        public token1_amount: u128, // ALEO amount
        public token2_amount: u128, // Custom token amount
        public min_lp_tokens: u128
    ) -> Future {
        // Ensure positive amounts
        assert(token1_amount > 0u128 && token2_amount > 0u128);
        
        // Get caller address outside async block
        let caller_address: address = self.caller;
        
        return async {
            // Get current pool state
            let current_pool: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo {
                    id: 0field,
                    token1_id: 0field,
                    token2_id: 0field,
                    reserve1: 0u128,
                    reserve2: 0u128,
                    lp_total_supply: 0u128,
                    swap_fee: 0u16,
                    protocol_fee: 0u16,
                    pool_type: 0u8,
                }
            );
            
            // Ensure pool exists
            assert(current_pool.id != 0field);
            
            // Calculate optimal amounts to maintain ratio
            let optimal_token2: u128 = (token1_amount * current_pool.reserve2) / current_pool.reserve1;
            let optimal_token1: u128 = (token2_amount * current_pool.reserve1) / current_pool.reserve2;
            
            // Use the smaller ratio to maintain pool balance
            let actual_token1: u128 = token1_amount < optimal_token1 ? token1_amount : optimal_token1;
            let actual_token2: u128 = token2_amount < optimal_token2 ? token2_amount : optimal_token2;
            
            // Calculate LP tokens to mint
            let lp_tokens_to_mint: u128 = (actual_token1 * current_pool.lp_total_supply) / current_pool.reserve1;
            
            // Ensure minimum LP tokens
            assert(lp_tokens_to_mint >= min_lp_tokens);
            
            // Update pool reserves
            let new_reserve1: u128 = current_pool.reserve1 + actual_token1;
            let new_reserve2: u128 = current_pool.reserve2 + actual_token2;
            let new_lp_total_supply: u128 = current_pool.lp_total_supply + lp_tokens_to_mint;
            
            // Update pool state
            let updated_pool: PoolInfo = PoolInfo {
                id: current_pool.id,
                token1_id: current_pool.token1_id,
                token2_id: current_pool.token2_id,
                reserve1: new_reserve1,
                reserve2: new_reserve2,
                lp_total_supply: new_lp_total_supply,
                swap_fee: current_pool.swap_fee,
                protocol_fee: current_pool.protocol_fee,
                pool_type: current_pool.pool_type,
            };
            
            Mapping::set(pools, pool_id, updated_pool);
            
            // Update or create liquidity position
            let position_key: field = (caller_address as field) + pool_id;
            let existing_position: LiquidityPosition = Mapping::get_or_use(
                liquidity_positions,
                position_key,
                LiquidityPosition {
                    user_address: caller_address,
                    pool_id: pool_id,
                    lp_tokens: 0u128,
                    timestamp: 0u64,
                }
            );
            
            let new_lp_tokens: u128 = existing_position.lp_tokens + lp_tokens_to_mint;
            let updated_position: LiquidityPosition = LiquidityPosition {
                user_address: caller_address,
                pool_id: pool_id,
                lp_tokens: new_lp_tokens,
                timestamp: 0u64,
            };
            
            Mapping::set(liquidity_positions, position_key, updated_position);
        };
    }

    // Remove liquidity from a pool
    async transition remove_liquidity(
        public pool_id: field,
        public lp_tokens_to_burn: u128,
        public min_token1_out: u128,
        public min_token2_out: u128
    ) -> Future {
        // Ensure positive amount
        assert(lp_tokens_to_burn > 0u128);
        
        // Get caller address outside async block
        let caller_address: address = self.caller;
        
        return async {
            // Get current pool state
            let current_pool: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo {
                    id: 0field,
                    token1_id: 0field,
                    token2_id: 0field,
                    reserve1: 0u128,
                    reserve2: 0u128,
                    lp_total_supply: 0u128,
                    swap_fee: 0u16,
                    protocol_fee: 0u16,
                    pool_type: 0u8,
                }
            );
            
            // Ensure pool exists
            assert(current_pool.id != 0field);
            
            // Get user's liquidity position
            let position_key: field = (caller_address as field) + pool_id;
            let user_position: LiquidityPosition = Mapping::get_or_use(
                liquidity_positions,
                position_key,
                LiquidityPosition {
                    user_address: caller_address,
                    pool_id: pool_id,
                    lp_tokens: 0u128,
                    timestamp: 0u64,
                }
            );
            
            // Ensure user has enough LP tokens
            assert(user_position.lp_tokens >= lp_tokens_to_burn);
            
            // Calculate amounts to withdraw
            let token1_to_withdraw: u128 = (lp_tokens_to_burn * current_pool.reserve1) / current_pool.lp_total_supply;
            let token2_to_withdraw: u128 = (lp_tokens_to_burn * current_pool.reserve2) / current_pool.lp_total_supply;
            
            // Slippage protection
            assert(token1_to_withdraw >= min_token1_out);
            assert(token2_to_withdraw >= min_token2_out);
            
            // Update pool reserves
            let new_reserve1: u128 = current_pool.reserve1 - token1_to_withdraw;
            let new_reserve2: u128 = current_pool.reserve2 - token2_to_withdraw;
            let new_lp_total_supply: u128 = current_pool.lp_total_supply - lp_tokens_to_burn;
            
            // Update pool state
            let updated_pool: PoolInfo = PoolInfo {
                id: current_pool.id,
                token1_id: current_pool.token1_id,
                token2_id: current_pool.token2_id,
                reserve1: new_reserve1,
                reserve2: new_reserve2,
                lp_total_supply: new_lp_total_supply,
                swap_fee: current_pool.swap_fee,
                protocol_fee: current_pool.protocol_fee,
                pool_type: current_pool.pool_type,
            };
            
            Mapping::set(pools, pool_id, updated_pool);
            
            // Update user's liquidity position
            let new_lp_tokens: u128 = user_position.lp_tokens - lp_tokens_to_burn;
            let updated_position: LiquidityPosition = LiquidityPosition {
                user_address: caller_address,
                pool_id: pool_id,
                lp_tokens: new_lp_tokens,
                timestamp: 0u64,
            };
            
            Mapping::set(liquidity_positions, position_key, updated_position);
        };
    }

    // Swap ALEO for custom token (constant product AMM)
    async transition swap_aleo_for_token(
        public pool_id: field,
        public aleo_in: u128,
        public min_token_out: u128
    ) -> Future {
        // Ensure positive amount
        assert(aleo_in > 0u128);
        
        return async {
            // Get current pool state
            let current_pool: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo {
                    id: 0field,
                    token1_id: 0field,
                    token2_id: 0field,
                    reserve1: 0u128,
                    reserve2: 0u128,
                    lp_total_supply: 0u128,
                    swap_fee: 0u16,
                    protocol_fee: 0u16,
                    pool_type: 0u8,
                }
            );
            
            // Ensure pool exists and is AMM type
            assert(current_pool.id != 0field);
            assert(current_pool.pool_type == 0u8);
            
            // Calculate output amount using constant product formula
            // (x + dx) * (y - dy) = x * y
            // dy = (dx * y) / (x + dx)
            let aleo_reserve: u128 = current_pool.reserve1;
            let token_reserve: u128 = current_pool.reserve2;
            
            // Apply swap fee
            let aleo_in_with_fee: u128 = aleo_in * (10000u128 - current_pool.swap_fee as u128) / 10000u128;
            
            // Calculate token output
            let token_out: u128 = (aleo_in_with_fee * token_reserve) / (aleo_reserve + aleo_in_with_fee);
            
            // Ensure minimum output
            assert(token_out >= min_token_out);
            
            // Calculate protocol fees
            let protocol_fee_amount: u128 = (aleo_in * current_pool.protocol_fee as u128) / 10000u128;
            
            // Update pool reserves
            let new_aleo_reserve: u128 = aleo_reserve + aleo_in;
            let new_token_reserve: u128 = token_reserve - token_out;
            
            let updated_pool: PoolInfo = PoolInfo {
                id: current_pool.id,
                token1_id: current_pool.token1_id,
                token2_id: current_pool.token2_id,
                reserve1: new_aleo_reserve,
                reserve2: new_token_reserve,
                lp_total_supply: current_pool.lp_total_supply,
                swap_fee: current_pool.swap_fee,
                protocol_fee: current_pool.protocol_fee,
                pool_type: current_pool.pool_type,
            };
            
            Mapping::set(pools, pool_id, updated_pool);
            
            // Accumulate protocol fees
            let current_protocol_fees: u128 = Mapping::get_or_use(protocol_fees, 0field, 0u128);
            let new_protocol_fees: u128 = current_protocol_fees + protocol_fee_amount;
            Mapping::set(protocol_fees, 0field, new_protocol_fees);
        };
    }

    // Get pool information
    async transition get_pool_info(
        public pool_id: field
    ) -> Future {
        return async {
            let pool_info: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo {
                    id: 0field,
                    token1_id: 0field,
                    token2_id: 0field,
                    reserve1: 0u128,
                    reserve2: 0u128,
                    lp_total_supply: 0u128,
                    swap_fee: 0u16,
                    protocol_fee: 0u16,
                    pool_type: 0u8,
                }
            );
        };
    }

    // Get user's liquidity position
    async transition get_user_position(
        public user_address: address,
        public pool_id: field
    ) -> Future {
        return async {
            let position_key: field = (user_address as field) + pool_id;
            let position: LiquidityPosition = Mapping::get_or_use(
                liquidity_positions,
                position_key,
                LiquidityPosition {
                    user_address: user_address,
                    pool_id: pool_id,
                    lp_tokens: 0u128,
                    timestamp: 0u64,
                }
            );
        };
    }

    // Simple test function to verify contract connectivity
    async transition test_connection() -> Future {
        return async {
            // This function just returns successfully to test if the contract can be called
            // It doesn't modify any state or require any inputs
        };
    }

    // Get swap quote (fixed 4:1 rate)
    async transition get_swap_quote(
        public pool_id: field,
        public input_amount: u128,
        public is_aleo_to_token: bool // true = ALEO->token, false = token->ALEO
    ) -> Future {
        return async {
            let pool: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
            );
            
            if pool.id == 0field {
                // Pool doesn't exist - continue with default values
            }
            
            if is_aleo_to_token {
                // ALEO -> token: 4 ALEO = 1 custom token
                let token_out: u128 = input_amount / EXCHANGE_RATE;
                // Return token_out (you can add a return value if needed)
            } else {
                // token -> ALEO: 1 custom token = 4 ALEO
                let aleo_out: u128 = input_amount * EXCHANGE_RATE;
                // Return aleo_out (you can add a return value if needed)
            }
        };
    }

    // MVP public-only: create pool by transferring public ALEO and token to a custody address
    async transition create_pool_public(
        public custody_address: address,
        public aleo_in: u64,
        public token_in: u128,
        public min_lp: u128
    ) -> Future {
        // basic checks
        assert(aleo_in > 0u64);
        assert(token_in > 0u128);

        return async {
            // Ensure pool 1 isn't initialized yet
            let exists: PoolInfo = Mapping::get_or_use(
                pools,
                1field,
                PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
            );
            assert(exists.id == 0field);

            // Initialize reserves and LP (simple model)
            let aleo_in_u128: u128 = aleo_in as u128;
            let lp: u128 = aleo_in_u128 + token_in;
            assert(lp >= min_lp);

            let pool_info: PoolInfo = PoolInfo {
                id: 1field,
                token1_id: 0field,
                token2_id: TOKEN_ID,
                reserve1: aleo_in_u128,
                reserve2: token_in,
                lp_total_supply: lp,
                swap_fee: SWAP_FEE,
                protocol_fee: PROTOCOL_FEE,
                pool_type: 0u8,
            };
            Mapping::set(pools, 1field, pool_info);
        };
    }

    // MVP public-only: add liquidity by transferring public ALEO and token to custody
    async transition add_liquidity_public(
        public pool_id: field,
        public custody_address: address,
        public aleo_in: u64,
        public token_in: u128,
        public min_lp: u128
    ) -> Future {
        assert(aleo_in > 0u64);
        assert(token_in > 0u128);

        return async {
            // Load pool
            let current_pool: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
            );
            assert(current_pool.id != 0field);

            // Update reserves and LP (simple proportional mint)
            let aleo_in_u128: u128 = aleo_in as u128;
            let new_reserve1: u128 = current_pool.reserve1 + aleo_in_u128;
            let new_reserve2: u128 = current_pool.reserve2 + token_in;
            let new_lp: u128 = current_pool.lp_total_supply + aleo_in_u128; // simplistic
            assert(new_lp >= min_lp);

            let updated: PoolInfo = PoolInfo {
                id: current_pool.id,
                token1_id: current_pool.token1_id,
                token2_id: current_pool.token2_id,
                reserve1: new_reserve1,
                reserve2: new_reserve2,
                lp_total_supply: new_lp,
                swap_fee: current_pool.swap_fee,
                protocol_fee: current_pool.protocol_fee,
                pool_type: current_pool.pool_type,
            };
            Mapping::set(pools, pool_id, updated);
        };
    }

    // MVP public-only: swap ALEO for token (fixed 4:1 rate)
    async transition swap_aleo_for_token_public(
        public pool_id: field,
        public custody_address: address,
        public aleo_in: u64,
        public min_token_out: u128
    ) -> Future {
        assert(aleo_in > 0u64);

        return async {
            // Load pool
            let p: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
            );
            assert(p.id != 0field);
            assert(p.pool_type == 0u8);

            // Fixed rate: 4 ALEO = 1 custom token
            let aleo_in_u128: u128 = aleo_in as u128;
            let token_out: u128 = aleo_in_u128 / EXCHANGE_RATE;
            
            // Ensure minimum output
            assert(token_out >= min_token_out);
            
            // Ensure sufficient reserves
            assert(p.reserve2 >= token_out);

            // Update reserves
            let new_r1: u128 = p.reserve1 + aleo_in_u128;
            let new_r2: u128 = p.reserve2 - token_out;
            let np: PoolInfo = PoolInfo {
                id: p.id,
                token1_id: p.token1_id,
                token2_id: p.token2_id,
                reserve1: new_r1,
                reserve2: new_r2,
                lp_total_supply: p.lp_total_supply,
                swap_fee: p.swap_fee,
                protocol_fee: p.protocol_fee,
                pool_type: p.pool_type,
            };
            Mapping::set(pools, pool_id, np);
        };
    }





    // MVP public-only: swap token for ALEO (fixed 4:1 rate)
    async transition swap_token_for_aleo_public(
        public pool_id: field,
        public custody_address: address,
        public token_in: u128,
        public min_aleo_out: u128
    ) -> Future {
        assert(token_in > 0u128);

        return async {
            // Load pool
            let p: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
            );
            assert(p.id != 0field);
            assert(p.pool_type == 0u8);

            // Fixed rate: 1 custom token = 4 ALEO
            let aleo_out: u128 = token_in * EXCHANGE_RATE;
            
            // Ensure minimum output
            assert(aleo_out >= min_aleo_out);
            
            // Ensure sufficient reserves
            assert(p.reserve1 >= aleo_out);

            // Update reserves
            let new_r1: u128 = p.reserve1 - aleo_out;
            let new_r2: u128 = p.reserve2 + token_in;
            let np: PoolInfo = PoolInfo {
                id: p.id,
                token1_id: p.token1_id,
                token2_id: p.token2_id,
                reserve1: new_r1,
                reserve2: new_r2,
                lp_total_supply: p.lp_total_supply,
                swap_fee: p.swap_fee,
                protocol_fee: p.protocol_fee,
                pool_type: p.pool_type,
            };
            Mapping::set(pools, pool_id, np);
        };
    }


}
