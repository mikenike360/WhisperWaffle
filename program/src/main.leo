// Import external programs for token transfers
import credits.aleo;
import token_registry.aleo;

program whisper_waffle_swap_v1.aleo {


    // Token configuration
    const NATIVE_ALEO_ID: field = 0field; // Special ID for native ALEO credits
    const MAX_INITIAL_RATIO: u128 = 10000u128; // Max 10000:1 initial ratio

    // Pool configuration
    const SWAP_FEE: u16 = 30u16; // 0.3% swap fee (30 basis points)
    const MIN_LIQUIDITY: u128 = 1000000u128; // Minimum liquidity to prevent division by zero

    // Data structures
    struct PoolInfo {
        id: field,
        token1_id: field, // Token A ID
        token2_id: field, // Token B ID
        reserve1: u128,   // Token A reserve
        reserve2: u128,   // Token B reserve
        lp_total_supply: u128,
        swap_fee: u16,
        pool_type: u8, // 0 = constant product (AMM), 1 = stable
    }

    struct PoolKey {
        token1: field,
        token2: field,
    }

    struct PositionKey {
        user: address,
        pool_id: field,
    }

    struct LiquidityPosition {
        user_address: address,
        pool_id: field,
        lp_tokens: u128,
        timestamp: u64,
    }

    // Global state mappings
    mapping pools: field => PoolInfo;
    mapping liquidity_positions: field => LiquidityPosition;
    mapping pool_count: bool => u32; // true => total pools
    mapping pool_list: u32 => field; // index => pool_id
    mapping pool_exists: field => bool; // pool_id => exists (prevent duplicates)

    // Helper functions
    inline safe_mul_div(a: u128, b: u128, c: u128) -> u128 {
        return (a * b) / c;
    }

    inline apply_fee(amount: u128, fee_bps: u16) -> u128 {
        return (amount * (10000u128 - (fee_bps as u128))) / 10000u128;
    }

    inline get_amount_out(
        amount_in: u128, 
        reserve_in: u128, 
        reserve_out: u128, 
        swap_fee: u16
    ) -> u128 {
        let amount_in_with_fee: u128 = apply_fee(amount_in, swap_fee);
        let numerator: u128 = amount_in_with_fee * reserve_out;
        let denominator: u128 = reserve_in + amount_in_with_fee;
        return numerator / denominator;
    }

    inline sqrt_approx(x: u128) -> u128 {
        if x == 0u128 { return 0u128; }
        let z: u128 = x;
        let y: u128 = (x + 1u128) / 2u128;
        // Simple Newton's method approximation
        z = (y + x / y) / 2u128;
        return z;
    }

    inline get_pool_id(token1: field, token2: field) -> field {
        let ordered_token1: field = token1 < token2 ? token1 : token2;
        let ordered_token2: field = token1 < token2 ? token2 : token1;
        return BHP256::hash_to_field(PoolKey { 
            token1: ordered_token1, 
            token2: ordered_token2 
        });
    }

    inline get_position_key(user: address, pool_id: field) -> field {
        return BHP256::hash_to_field(PositionKey { user, pool_id });
    }

    inline validate_pool_creation(
        token1_id: field,
        token2_id: field,
        amount1: u128,
        amount2: u128
    ) {
        assert(token1_id != token2_id);
        assert(amount1 >= MIN_LIQUIDITY);
        assert(amount2 >= MIN_LIQUIDITY);
        
        // Prevent extreme initial ratios
        let ratio: u128 = amount2 > amount1 ? (amount2 / amount1) : (amount1 / amount2);
        assert(ratio <= MAX_INITIAL_RATIO);
    }

    @admin(address="aleo1xh0ncflwkfzga983lwujsha729c8nwu7phfn8aw7h3gahhj0ms8qytrxec")
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
                    pool_type: 0u8,
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

    // Get swap quote using AMM pricing
    async transition get_swap_quote(
        public token1_id: field,
        public token2_id: field,
        public input_amount: u128,
        public is_token1_to_token2: bool // true = token1->token2, false = token2->token1
    ) -> Future {
        return async {
            let pool_id: field = get_pool_id(token1_id, token2_id);
            let pool: PoolInfo = Mapping::get_or_use(
                pools,
                pool_id,
                PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, pool_type: 0u8 }
            );
            
            if pool.id == 0field {
                // Pool doesn't exist - continue with default values
            }
            
            if is_token1_to_token2 {
                // token1 -> token2
                let reserve_in: u128 = pool.token1_id == token1_id ? pool.reserve1 : pool.reserve2;
                let reserve_out: u128 = pool.token1_id == token1_id ? pool.reserve2 : pool.reserve1;
                let token_out: u128 = get_amount_out(input_amount, reserve_in, reserve_out, pool.swap_fee);
                // Return token_out (you can add a return value if needed)
            } else {
                // token2 -> token1
                let reserve_in: u128 = pool.token1_id == token2_id ? pool.reserve2 : pool.reserve1;
                let reserve_out: u128 = pool.token1_id == token2_id ? pool.reserve1 : pool.reserve2;
                let token_out: u128 = get_amount_out(input_amount, reserve_in, reserve_out, pool.swap_fee);
                // Return token_out (you can add a return value if needed)
            }
        };
    }

    // Create pool for native ALEO + token pair
    async transition create_pool_native_aleo(
        public token_id: field,
        public aleo_amount: u128,
        public token_amount: u128,
        public swap_fee: u16,
        public min_lp: u128
    ) -> Future {
        // Validate pool creation
        validate_pool_creation(NATIVE_ALEO_ID, token_id, aleo_amount, token_amount);
        assert(swap_fee <= 10000u16);
        
        // Transfer ALEO FROM user TO program
        let aleo_future: Future = credits.aleo/transfer_public_as_signer(self.address, (aleo_amount as u64));
        
        // Transfer token FROM user TO program
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(token_id, self.address, token_amount);
        
        // Call finalize function
        return finalize_create_pool(aleo_future, token_future, self.caller, NATIVE_ALEO_ID, token_id, aleo_amount, token_amount, swap_fee, min_lp);
    }

    // Create pool for token + token pair
    async transition create_pool_tokens(
        public token1_id: field,
        public token2_id: field,
        public token1_amount: u128,
        public token2_amount: u128,
        public swap_fee: u16,
        public min_lp: u128
    ) -> Future {
        // Validate pool creation
        validate_pool_creation(token1_id, token2_id, token1_amount, token2_amount);
        assert(swap_fee <= 10000u16);
        
        // Transfer token1 FROM user TO program
        let token1_future: Future = token_registry.aleo/transfer_public_as_signer(token1_id, self.address, token1_amount);
        
        // Transfer token2 FROM user TO program
        let token2_future: Future = token_registry.aleo/transfer_public_as_signer(token2_id, self.address, token2_amount);
        
        // Call finalize function
        return finalize_create_pool(token1_future, token2_future, self.caller, token1_id, token2_id, token1_amount, token2_amount, swap_fee, min_lp);
    }

    // Add liquidity to native ALEO + token pool
    async transition add_liquidity_native_aleo(
        public token_id: field,
        public aleo_amount: u128,
        public token_amount: u128,
        public min_lp: u128
    ) -> Future {
        assert(aleo_amount > 0u128);
        assert(token_amount > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);

        // Transfer ALEO FROM user TO program
        let aleo_future: Future = credits.aleo/transfer_public_as_signer(self.address, (aleo_amount as u64));
        
        // Transfer token FROM user TO program
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(token_id, self.address, token_amount);
        
        // Call finalize function
        return finalize_add_liquidity(aleo_future, token_future, pool_id, caller_address, aleo_amount, token_amount, min_lp);
    }

    // Add liquidity to token + token pool
    async transition add_liquidity_tokens(
        public token1_id: field,
        public token2_id: field,
        public token1_amount: u128,
        public token2_amount: u128,
        public min_lp: u128
    ) -> Future {
        assert(token1_amount > 0u128);
        assert(token2_amount > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(token1_id, token2_id);

        // Transfer token1 FROM user TO program
        let token1_future: Future = token_registry.aleo/transfer_public_as_signer(token1_id, self.address, token1_amount);
        
        // Transfer token2 FROM user TO program
        let token2_future: Future = token_registry.aleo/transfer_public_as_signer(token2_id, self.address, token2_amount);
        
        // Call finalize function
        return finalize_add_liquidity(token1_future, token2_future, pool_id, caller_address, token1_amount, token2_amount, min_lp);
    }





    // Remove liquidity from native ALEO + token pool
    async transition remove_liquidity_native_aleo(
        public token_id: field,
        public lp_tokens_to_burn: u128,
        public min_aleo_out: u128,
        public min_token_out: u128
    ) -> Future {
        assert(lp_tokens_to_burn > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);

        // Transfer ALEO FROM program TO user
        let aleo_future: Future = credits.aleo/transfer_public(caller_address, (min_aleo_out as u64));
        
        // Transfer token FROM program TO user
        let token_future: Future = token_registry.aleo/transfer_public(token_id, caller_address, min_token_out);
        
        // Return the futures and call finalize function
        return finalize_remove_liquidity(aleo_future, token_future, pool_id, caller_address, lp_tokens_to_burn, min_aleo_out, min_token_out);
    }

    // Remove liquidity from token + token pool
    async transition remove_liquidity_tokens(
        public token1_id: field,
        public token2_id: field,
        public lp_tokens_to_burn: u128,
        public min_token1_out: u128,
        public min_token2_out: u128
    ) -> Future {
        assert(lp_tokens_to_burn > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(token1_id, token2_id);

        // Transfer token1 FROM program TO user
        let token1_future: Future = token_registry.aleo/transfer_public(token1_id, caller_address, min_token1_out);
        
        // Transfer token2 FROM program TO user
        let token2_future: Future = token_registry.aleo/transfer_public(token2_id, caller_address, min_token2_out);
        
        // Return the futures and call finalize function
        return finalize_remove_liquidity(token1_future, token2_future, pool_id, caller_address, lp_tokens_to_burn, min_token1_out, min_token2_out);
    }

    // Swap native ALEO for token using AMM pricing
    async transition swap_aleo_for_token(
        public token_id: field,
        public aleo_in: u128,
        public min_token_out: u128
    ) -> Future {
        assert(aleo_in > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);

        // Transfer ALEO FROM user TO program
        let aleo_future: Future = credits.aleo/transfer_public_as_signer(self.address, (aleo_in as u64));
        
        // Transfer token FROM program TO user
        let token_future: Future = token_registry.aleo/transfer_public(token_id, caller_address, min_token_out);
        
        // Return the futures and call finalize function
        return finalize_swap_token1_for_token2(aleo_future, token_future, pool_id, caller_address, NATIVE_ALEO_ID, token_id, aleo_in, min_token_out);
    }

    // Swap token for native ALEO using AMM pricing
    async transition swap_token_for_aleo(
        public token_id: field,
        public token_in: u128,
        public min_aleo_out: u128
    ) -> Future {
        assert(token_in > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);

        // Transfer token FROM user TO program
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(token_id, self.address, token_in);
        
        // Transfer ALEO FROM program TO user
        let aleo_future: Future = credits.aleo/transfer_public(caller_address, (min_aleo_out as u64));
        
        // Return the futures and call finalize function
        return finalize_swap_token1_for_token2(token_future, aleo_future, pool_id, caller_address, token_id, NATIVE_ALEO_ID, token_in, min_aleo_out);
    }

    // Swap token1 for token2 using AMM pricing
    async transition swap_tokens(
        public token1_id: field,
        public token2_id: field,
        public token1_in: u128,
        public min_token2_out: u128
    ) -> Future {
        assert(token1_in > 0u128);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(token1_id, token2_id);

        // Transfer token1 FROM user TO program
        let token1_future: Future = token_registry.aleo/transfer_public_as_signer(token1_id, self.address, token1_in);
        
        // Transfer token2 FROM program TO user
        let token2_future: Future = token_registry.aleo/transfer_public(token2_id, caller_address, min_token2_out);
        
        // Return the futures and call finalize function
        return finalize_swap_token1_for_token2(token1_future, token2_future, pool_id, caller_address, token1_id, token2_id, token1_in, min_token2_out);
    }

    // Finalize: Handle liquidity addition and state updates
    async function finalize_add_liquidity(
        token1_future: Future,
        token2_future: Future,
        pool_id: field,
        caller_address: address,
        token1_amount: u128,
        token2_amount: u128,
        min_lp: u128
    ) {
        // Await both token transfers
        token1_future.await();
        token2_future.await();

        // Load pool
        let current_pool: PoolInfo = Mapping::get_or_use(
            pools,
            pool_id,
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, pool_type: 0u8 }
        );
        assert(current_pool.id != 0field);

        // Calculate proportional LP tokens to mint
        let lp_from_token1: u128 = (token1_amount * current_pool.lp_total_supply) / current_pool.reserve1;
        let lp_from_token2: u128 = (token2_amount * current_pool.lp_total_supply) / current_pool.reserve2;
        let lp_to_mint: u128 = lp_from_token2 < lp_from_token1 ? lp_from_token2 : lp_from_token1;
        assert(lp_to_mint >= min_lp);

        // Update reserves and LP
        let new_reserve1: u128 = current_pool.reserve1 + token1_amount;
        let new_reserve2: u128 = current_pool.reserve2 + token2_amount;
        let new_lp_total: u128 = current_pool.lp_total_supply + lp_to_mint;

        let updated: PoolInfo = PoolInfo {
            id: current_pool.id,
            token1_id: current_pool.token1_id,
            token2_id: current_pool.token2_id,
            reserve1: new_reserve1,
            reserve2: new_reserve2,
            lp_total_supply: new_lp_total,
            swap_fee: current_pool.swap_fee,
            pool_type: current_pool.pool_type,
        };
        Mapping::set(pools, pool_id, updated);

        // Track individual user's LP position
        let position_key: field = get_position_key(caller_address, pool_id);
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

        let new_lp_tokens: u128 = user_position.lp_tokens + lp_to_mint;
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
            PoolInfo { id: 0field, token1_id: 0field, token2_id: 0field, reserve1: 0u128, reserve2: 0u128, lp_total_supply: 0u128, swap_fee: 0u16, pool_type: 0u8 }
        );
        assert(current_pool.id != 0field);

        // Calculate proportional amounts to return
        let wrapped_aleo_out: u128 = (current_pool.reserve1 * lp_tokens_to_burn) / current_pool.lp_total_supply;
        let token_out: u128 = (current_pool.reserve2 * lp_tokens_to_burn) / current_pool.lp_total_supply;

        // Ensure minimum outputs (slippage protection)
        assert(wrapped_aleo_out >= min_wrapped_aleo_out);
        assert(token_out >= min_token_out);

        // Update pool reserves - subtract the calculated amounts (what user should get)
        // The transfers were done with minimum amounts, but we need to subtract calculated amounts
        // to ensure proper accounting. The difference (if any) between calculated and minimum
        // is part of slippage protection and stays in the pool.
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
            pool_type: current_pool.pool_type,
        };
        Mapping::set(pools, pool_id, updated_pool);

        // Update user's LP position
        let position_key: field = get_position_key(caller_address, pool_id);
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

        // Validate user has enough LP tokens to burn
        assert(user_position.lp_tokens >= lp_tokens_to_burn);

        let new_lp_tokens: u128 = user_position.lp_tokens - lp_tokens_to_burn;
        let updated_position: LiquidityPosition = LiquidityPosition {
            user_address: caller_address,
            pool_id: pool_id,
            lp_tokens: new_lp_tokens,
            timestamp: 0u64,
        };
        Mapping::set(liquidity_positions, position_key, updated_position);
    }

    // Finalize: Handle swap calculations and state updates for token1 to token2
    async function finalize_swap_token1_for_token2(
        token1_future: Future,
        token2_future: Future,
        pool_id: field,
        caller: address,
        token1_id: field,
        token2_id: field,
        token1_in: u128,
        min_token2_out: u128
    ) {
        token1_future.await();
        token2_future.await();
        
        // Load pool
        let pool: PoolInfo = Mapping::get(pools, pool_id);
        
        // Determine which reserve is which
        let is_token1_first: bool = pool.token1_id == token1_id;
        let reserve_in: u128 = is_token1_first ? pool.reserve1 : pool.reserve2;
        let reserve_out: u128 = is_token1_first ? pool.reserve2 : pool.reserve1;
        
        // Calculate output using x*y=k
        let token2_out: u128 = get_amount_out(token1_in, reserve_in, reserve_out, pool.swap_fee);
        assert(token2_out >= min_token2_out);
        
        // Update reserves
        let new_reserve1: u128 = is_token1_first ? (pool.reserve1 + token1_in) : (pool.reserve1 - token2_out);
        let new_reserve2: u128 = is_token1_first ? (pool.reserve2 - token2_out) : (pool.reserve2 + token1_in);
        
        // Validate k invariant
        let old_k: u128 = pool.reserve1 * pool.reserve2;
        let new_k: u128 = new_reserve1 * new_reserve2;
        assert(new_k >= old_k);
        
        // Update pool
        let updated_pool: PoolInfo = PoolInfo {
            id: pool.id,
            token1_id: pool.token1_id,
            token2_id: pool.token2_id,
            reserve1: new_reserve1,
            reserve2: new_reserve2,
            lp_total_supply: pool.lp_total_supply,
            swap_fee: pool.swap_fee,
            pool_type: pool.pool_type,
        };
        Mapping::set(pools, pool_id, updated_pool);
    }

    // Finalize: Handle pool creation and state updates
    async function finalize_create_pool(
        token1_future: Future,
        token2_future: Future,
        caller_address: address,
        token1_id: field,
        token2_id: field,
        token1_amount: u128,
        token2_amount: u128,
        swap_fee: u16,
        min_lp: u128
    ) {
        // Await both token transfers
        token1_future.await();
        token2_future.await();
        
        // Generate pool ID
        let pool_id: field = get_pool_id(token1_id, token2_id);
        
        // Check pool doesn't exist
        let exists: bool = Mapping::get_or_use(pool_exists, pool_id, false);
        assert(!exists);
        
        // Validate ratio
        let ratio: u128 = token2_amount > token1_amount ? (token2_amount / token1_amount) : (token1_amount / token2_amount);
        assert(ratio <= MAX_INITIAL_RATIO);
        
        // Calculate LP tokens (geometric mean)
        let lp: u128 = sqrt_approx(token1_amount * token2_amount);
        assert(lp >= min_lp);
        
        // Create pool
        let pool: PoolInfo = PoolInfo {
            id: pool_id,
            token1_id,
            token2_id,
            reserve1: token1_amount,
            reserve2: token2_amount,
            lp_total_supply: lp,
            swap_fee,
            pool_type: 0u8,
        };
        Mapping::set(pools, pool_id, pool);
        Mapping::set(pool_exists, pool_id, true);
        
        // Track user's LP position
        let pos_key: field = get_position_key(caller_address, pool_id);
        let position: LiquidityPosition = LiquidityPosition {
            user_address: caller_address,
            pool_id,
            lp_tokens: lp,
            timestamp: 0u64,
        };
        Mapping::set(liquidity_positions, pos_key, position);
        
        // Update pool count
        let count: u32 = Mapping::get_or_use(pool_count, true, 0u32);
        Mapping::set(pool_count, true, count + 1u32);
        Mapping::set(pool_list, count, pool_id);
    }

}
