// Import external programs for token transfers
import credits.aleo;
import token_registry.aleo;
import ww_swap_wrapped_credits_v1.aleo;

program ww_swap_v13.aleo {
    // Import the wrapped credits program - no more custody address needed!
    // const CUSTODY_ADDRESS: address = aleo13rxkgm5sewv50r4tcdkzrpfyvk6ev4n4fg8vdpt87a6ud7zar5rsegjl6z;

    // Token IDs - now using wrapped ALEO instead of direct ALEO
    const WRAPPED_ALEO_ID: field = 68744147421264673966385360field; // Your wrapped ALEO token ID
    const TOKEN_ID: field = 42069187360666field; // Your Waffle USDC token ID

    // Pool configuration
    const SWAP_FEE: u16 = 30u16; // 0.3% swap fee (30 basis points)
    const PROTOCOL_FEE: u16 = 5u16; // 0.05% protocol fee (5 basis points)
    const MIN_LIQUIDITY: u128 = 1000000u128; // Minimum liquidity to prevent division by zero
    
    // Fixed exchange rate for MVP - now wrapped ALEO to custom token
    const EXCHANGE_RATE: u128 = 4u128; // 4 wrapped ALEO = 1 custom token

    // Data structures
    struct PoolInfo {
        id: field,
        token1_id: field, // Wrapped ALEO token ID (not direct ALEO)
        token2_id: field, // Custom token ID
        reserve1: u128,   // Wrapped ALEO reserve
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
    async transition get_user_liquidity_position(
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
        public is_waleo_to_token: bool // true = wALEO->token, false = token->wALEO
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
            
            if is_waleo_to_token {
                // wALEO -> token: 4 wALEO = 1 custom token
                let token_out: u128 = input_amount / EXCHANGE_RATE;
                // Return token_out (you can add a return value if needed)
            } else {
                // token -> wALEO: 1 custom token = 4 wALEO
                let waleo_out: u128 = input_amount * EXCHANGE_RATE;
                // Return waleo_out (you can add a return value if needed)
            }
        };
    }

    // MVP public-only: create pool by transferring wrapped ALEO and custom tokens to the program
    async transition create_pool_public(
        public wrapped_aleo_in: u128,
        public token_in: u128,
        public min_lp: u128
    ) -> Future {
        // basic checks
        assert(wrapped_aleo_in > 0u128);
        assert(token_in > 0u128);

        // Move wrapped ALEO FROM user TO program using transfer_public_as_signer
        let wrapped_aleo_future: Future = token_registry.aleo/transfer_public_as_signer(
            WRAPPED_ALEO_ID, self.address, wrapped_aleo_in
        );
        
        // Move custom tokens FROM user TO program using transfer_public_as_signer
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(
            TOKEN_ID, self.address, token_in
        );
        
        // Return the futures and call finalize function
        return finalize_create_pool(wrapped_aleo_future, token_future, self.caller, wrapped_aleo_in, token_in, min_lp);
    }

    // MVP public-only: add liquidity by transferring wrapped ALEO and custom tokens to the program
    async transition add_liquidity_public(
        public pool_id: field,
        public wrapped_aleo_in: u128,
        public token_in: u128,
        public min_lp: u128
    ) -> Future {
        assert(wrapped_aleo_in > 0u128);
        assert(token_in > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Move wrapped ALEO FROM user TO program using transfer_public_as_signer
        let wrapped_aleo_future: Future = token_registry.aleo/transfer_public_as_signer(
            WRAPPED_ALEO_ID, self.address, wrapped_aleo_in
        );
        
        // Move custom tokens FROM user TO program using transfer_public_as_signer
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(
            TOKEN_ID, self.address, token_in
        );
        
        // Return the futures and call finalize function
        return finalize_add_liquidity(wrapped_aleo_future, token_future, pool_id, caller_address, wrapped_aleo_in, token_in, min_lp);
    }





    // MVP public-only: remove liquidity and return proportional tokens
    async transition remove_liquidity_public(
        public pool_id: field,
        public lp_tokens_to_burn: u128,
        public min_wrapped_aleo_out: u128,
        public min_token_out: u128
    ) -> Future {
        assert(lp_tokens_to_burn > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // We need to get the current pool info to calculate proportional amounts
        // Since we can't do complex calculations in transition, we'll pass the calculation to finalize
        // and use the min amounts as placeholders for now
        
        // Move wrapped ALEO FROM program TO user using transfer_public
        let wrapped_aleo_future: Future = token_registry.aleo/transfer_public(
            WRAPPED_ALEO_ID, caller_address, min_wrapped_aleo_out
        );
        
        // Move custom tokens FROM program TO user using transfer_public
        let token_future: Future = token_registry.aleo/transfer_public(
            TOKEN_ID, caller_address, min_token_out
        );
        
        // Return the futures and call finalize function
        return finalize_remove_liquidity(wrapped_aleo_future, token_future, pool_id, caller_address, lp_tokens_to_burn, min_wrapped_aleo_out, min_token_out);
    }

    // MVP public-only: swap custom token for wrapped ALEO (fixed 4:1 rate)
    async transition swap_token_for_waleo(
        public pool_id: field,
        public token_in: u128,
        public min_wrapped_aleo_out: u128
    ) -> Future {
        assert(token_in > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Calculate wrapped ALEO output using 4:1 ratio
        let wrapped_aleo_out: u128 = token_in * EXCHANGE_RATE;

        // Move custom tokens FROM user TO program using transfer_public_as_signer
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(
            TOKEN_ID, self.address, token_in
        );
        
        // Move wrapped ALEO FROM program TO user using transfer_public with calculated amount
        let wrapped_aleo_future: Future = token_registry.aleo/transfer_public(
            WRAPPED_ALEO_ID, caller_address, wrapped_aleo_out
        );
        
        // Return the futures and call finalize function
        return finalize_swap_token_for_waleo(token_future, wrapped_aleo_future, pool_id, token_in, min_wrapped_aleo_out);
    }

    // MVP public-only: swap wrapped ALEO for custom token (fixed 4:1 rate)
    async transition swap_waleo_for_token(
        public pool_id: field,
        public wrapped_aleo_in: u128,
        public min_token_out: u128
    ) -> Future {
        assert(wrapped_aleo_in > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Calculate token output using 4:1 ratio
        let token_out: u128 = wrapped_aleo_in / EXCHANGE_RATE;

        // Move wrapped ALEO FROM user TO program using transfer_public_as_signer
        let wrapped_aleo_future: Future = token_registry.aleo/transfer_public_as_signer(
            WRAPPED_ALEO_ID, self.address, wrapped_aleo_in
        );
        
        // Move custom tokens FROM program TO user using transfer_public with calculated amount
        let token_future: Future = token_registry.aleo/transfer_public(
            TOKEN_ID, caller_address, token_out
        );
        
        // Return the futures and call finalize function
        return finalize_swap_waleo_for_token(wrapped_aleo_future, token_future, pool_id, wrapped_aleo_in, min_token_out);
    }

    // Finalize: Handle liquidity addition and state updates
    async function finalize_add_liquidity(
        wrapped_aleo_future: Future,
        token_future: Future,
        pool_id: field,
        caller_address: address,
        wrapped_aleo_in: u128,
        token_in: u128,
        min_lp: u128
    ) {
        // Await both token transfers
        wrapped_aleo_future.await();
        token_future.await();

        // Load pool
        let current_pool: PoolInfo = Mapping::get_or_use(
            pools,
            pool_id,
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
        );
        assert(current_pool.id != 0field);

        // Update reserves and LP (simple proportional mint)
        let new_reserve1: u128 = current_pool.reserve1 + wrapped_aleo_in;
        let new_reserve2: u128 = current_pool.reserve2 + token_in;
        let new_lp: u128 = current_pool.lp_total_supply + wrapped_aleo_in; // simplistic
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

        // Track individual user's LP position
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

        let new_lp_tokens: u128 = user_position.lp_tokens + wrapped_aleo_in;
        let updated_position: LiquidityPosition = LiquidityPosition {
            user_address: caller_address,
            pool_id: pool_id,
            lp_tokens: new_lp_tokens,
            timestamp: 0u64,
        };

        Mapping::set(liquidity_positions, position_key, updated_position);
    }

    // Finalize: Handle liquidity removal and state updates
    async function finalize_remove_liquidity(
        wrapped_aleo_future: Future,
        token_future: Future,
        pool_id: field,
        caller_address: address,
        lp_tokens_to_burn: u128,
        min_wrapped_aleo_out: u128,
        min_token_out: u128
    ) {
        // Await both token transfers
        wrapped_aleo_future.await();
        token_future.await();

        let current_pool: PoolInfo = Mapping::get_or_use(
            pools,
            pool_id,
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
        );
        assert(current_pool.id != 0field);

        // Calculate proportional amounts to return
        let wrapped_aleo_out: u128 = (current_pool.reserve1 * lp_tokens_to_burn) / current_pool.lp_total_supply;
        let token_out: u128 = (current_pool.reserve2 * lp_tokens_to_burn) / current_pool.lp_total_supply;

        // Ensure minimum outputs
        assert(wrapped_aleo_out >= min_wrapped_aleo_out);
        assert(token_out >= min_token_out);

        // Update pool reserves
        let new_reserve1: u128 = current_pool.reserve1 - wrapped_aleo_out;
        let new_reserve2: u128 = current_pool.reserve2 - token_out;
        let new_lp_total: u128 = current_pool.lp_total_supply - lp_tokens_to_burn;

        let updated_pool: PoolInfo = PoolInfo {
            id: current_pool.id,
            token1_id: current_pool.token1_id,
            token2_id: current_pool.token2_id,
            reserve1: new_reserve1,
            reserve2: new_reserve2,
            lp_total_supply: new_lp_total,
            swap_fee: current_pool.swap_fee,
            protocol_fee: current_pool.protocol_fee,
            pool_type: current_pool.pool_type,
        };
        Mapping::set(pools, pool_id, updated_pool);

        // Update user's LP position
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

        let new_lp_tokens: u128 = user_position.lp_tokens - lp_tokens_to_burn;
        let updated_position: LiquidityPosition = LiquidityPosition {
            user_address: caller_address,
            pool_id: pool_id,
            lp_tokens: new_lp_tokens,
            timestamp: 0u64,
        };
        Mapping::set(liquidity_positions, position_key, updated_position);
    }

    // Finalize: Handle swap calculations and state updates for token to wrapped ALEO
    async function finalize_swap_token_for_waleo(
        token_future: Future,
        wrapped_aleo_future: Future,
        pool_id: field,
        token_in: u128,
        min_wrapped_aleo_out: u128
    ) {
        // Await both token transfers
        token_future.await();
        wrapped_aleo_future.await();

        let p: PoolInfo = Mapping::get_or_use(
            pools,
            pool_id,
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
        );
        assert(p.id != 0field);
        assert(p.pool_type == 0u8);

        // Fixed rate: 1 custom token = 4 wrapped ALEO
        let wrapped_aleo_out: u128 = token_in * EXCHANGE_RATE;
        
        // Ensure minimum output
        assert(wrapped_aleo_out >= min_wrapped_aleo_out);
        
        // Ensure sufficient reserves
        assert(p.reserve1 >= wrapped_aleo_out);

        // Update reserves
        let new_r1: u128 = p.reserve1 - wrapped_aleo_out;
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
    }

    // Finalize: Handle pool creation and state updates
    async function finalize_create_pool(
        wrapped_aleo_future: Future,
        token_future: Future,
        caller_address: address,
        wrapped_aleo_in: u128,
        token_in: u128,
        min_lp: u128
    ) {
        // Await both token transfers
        wrapped_aleo_future.await();
        token_future.await();

        // Ensure pool 1 isn't initialized yet
        let exists: PoolInfo = Mapping::get_or_use(
            pools,
            1field,
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
        );
        assert(exists.id == 0field);

        // Initialize reserves and LP (simple model)
        let lp: u128 = wrapped_aleo_in + token_in;
        assert(lp >= min_lp);

        let pool_info: PoolInfo = PoolInfo {
            id: 1field,
            token1_id: WRAPPED_ALEO_ID,
            token2_id: TOKEN_ID,
            reserve1: wrapped_aleo_in,
            reserve2: token_in,
            lp_total_supply: lp,
            swap_fee: SWAP_FEE,
            protocol_fee: PROTOCOL_FEE,
            pool_type: 0u8,
        };
        Mapping::set(pools, 1field, pool_info);

        // Track individual user's LP position
        let position_key: field = (caller_address as field) + 1field;
        let user_position: LiquidityPosition = LiquidityPosition {
            user_address: caller_address,
            pool_id: 1field,
            lp_tokens: lp,
            timestamp: 0u64,
        };
        Mapping::set(liquidity_positions, position_key, user_position);
    }

    // Finalize: Handle swap calculations and state updates for wrapped ALEO to token
    async function finalize_swap_waleo_for_token(
        wrapped_aleo_future: Future,
        token_future: Future,
        pool_id: field,
        wrapped_aleo_in: u128,
        min_token_out: u128
    ) {
        // Await both token transfers
        wrapped_aleo_future.await();
        token_future.await();

        let p: PoolInfo = Mapping::get_or_use(
            pools,
            pool_id,
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, protocol_fee: 0u16, pool_type: 0u8 }
        );
        assert(p.id != 0field);
        assert(p.pool_type == 0u8);

        // Fixed rate: 4 wrapped ALEO = 1 custom token
        let token_out: u128 = wrapped_aleo_in / EXCHANGE_RATE;
        
        // Ensure minimum output
        assert(token_out >= min_token_out);
        
        // Ensure sufficient reserves
        assert(p.reserve2 >= token_out);

        // Update reserves
        let new_r1: u128 = p.reserve1 + wrapped_aleo_in;
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
    }

}
