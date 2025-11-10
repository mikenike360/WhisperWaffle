// Import external programs for token transfers
import credits.aleo;
import token_registry.aleo;

program whisper_waffle_swap_v4.aleo {


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
        
        // Call finalize function (canonical tokens computed in finalize)
        return finalize_create_pool(
            aleo_future,
            token_future,
            self.caller,
            NATIVE_ALEO_ID,
            token_id,
            aleo_amount,
            token_amount,
            swap_fee,
            min_lp
        );
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
        
        // Call finalize function (canonical tokens computed in finalize)
        return finalize_create_pool(
            token1_future,
            token2_future,
            self.caller,
            token1_id,
            token2_id,
            token1_amount,
            token2_amount,
            swap_fee,
            min_lp
        );
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

        // Call finalize function with canonical ordering (ALEO is always lower)
        return finalize_add_liquidity(
            aleo_future,
            token_future,
            pool_id,
            caller_address,
            NATIVE_ALEO_ID,
            token_id,
            aleo_amount,
            token_amount,
            min_lp
        );
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

        // Canonicalize ordering before finalize
        let low_token: field = token1_id < token2_id ? token1_id : token2_id;
        let high_token: field = token1_id < token2_id ? token2_id : token1_id;
        let low_amount: u128 = token1_id == low_token ? token1_amount : token2_amount;
        let high_amount: u128 = token1_id == low_token ? token2_amount : token1_amount;
        // Call finalize function
        return finalize_add_liquidity(
            token1_future,
            token2_future,
            pool_id,
            caller_address,
            low_token,
            high_token,
            low_amount,
            high_amount,
            min_lp
        );
    }





    // Remove liquidity from native ALEO + token pool
    async transition remove_liquidity_native_aleo(
        public token_id: field,
        public lp_tokens_to_burn: u128,
        public min_aleo_out: u128,
        public min_token_out: u128,
        public expected_aleo_out: u128,
        public expected_token_out: u128
    ) -> Future {
        assert(lp_tokens_to_burn > 0u128);
        assert(expected_aleo_out >= min_aleo_out);
        assert(expected_token_out >= min_token_out);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);

        assert(expected_aleo_out <= 18446744073709551615u128);

        let payout_low_future: Future = credits.aleo/transfer_public(caller_address, (expected_aleo_out as u64));
        let payout_high_future: Future = token_registry.aleo/transfer_public(token_id, caller_address, expected_token_out);

        return finalize_remove_liquidity(
            payout_low_future,
            payout_high_future,
            pool_id,
            caller_address,
            NATIVE_ALEO_ID,
            token_id,
            lp_tokens_to_burn,
            expected_aleo_out,
            expected_token_out,
            min_aleo_out,
            min_token_out,
            expected_aleo_out,
            expected_token_out
        );
    }

    // Remove liquidity from token + token pool
    async transition remove_liquidity_tokens(
        public token1_id: field,
        public token2_id: field,
        public lp_tokens_to_burn: u128,
        public min_token1_out: u128,
        public min_token2_out: u128,
        public expected_token1_out: u128,
        public expected_token2_out: u128
    ) -> Future {
        assert(lp_tokens_to_burn > 0u128);
        assert(expected_token1_out >= min_token1_out);
        assert(expected_token2_out >= min_token2_out);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(token1_id, token2_id);

        let payout_low_future: Future = token_registry.aleo/transfer_public(token1_id, caller_address, expected_token1_out);
        let payout_high_future: Future = token_registry.aleo/transfer_public(token2_id, caller_address, expected_token2_out);
        
        return finalize_remove_liquidity(
            payout_low_future,
            payout_high_future,
            pool_id,
            caller_address,
            token1_id,
            token2_id,
            lp_tokens_to_burn,
            expected_token1_out,
            expected_token2_out,
            min_token1_out,
            min_token2_out,
            expected_token1_out,
            expected_token2_out
        );
    }

    // Swap native ALEO for token using AMM pricing
    async transition swap_aleo_for_token(
        public token_id: field,
        public aleo_in: u128,
        public min_token_out: u128,
        public expected_token_out: u128
    ) -> Future {
        assert(aleo_in > 0u128);
        assert(expected_token_out >= min_token_out);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);
        let aleo_future: Future = credits.aleo/transfer_public_as_signer(self.address, (aleo_in as u64));
        let token_future: Future = token_registry.aleo/transfer_public(token_id, caller_address, expected_token_out);
        
        // Finalize swap
        return finalize_swap_token_output(
            aleo_future,
            token_future,
            pool_id,
            caller_address,
            NATIVE_ALEO_ID,
            token_id,
            aleo_in,
            expected_token_out,
            min_token_out,
            expected_token_out
        );
    }

    // Swap token for native ALEO using AMM pricing
    async transition swap_token_for_aleo(
        public token_id: field,
        public token_in: u128,
        public min_aleo_out: u128,
        public expected_aleo_out: u128
    ) -> Future {
        assert(token_in > 0u128);
        assert(expected_aleo_out >= min_aleo_out);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(NATIVE_ALEO_ID, token_id);

        // Transfer token FROM user TO program
        let token_future: Future = token_registry.aleo/transfer_public_as_signer(token_id, self.address, token_in);
        assert(expected_aleo_out <= 18446744073709551615u128);
        let aleo_future: Future = credits.aleo/transfer_public(caller_address, (expected_aleo_out as u64));
        
        return finalize_swap_aleo_output(
            token_future,
            aleo_future,
            pool_id,
            caller_address,
            token_id,
            token_in,
            expected_aleo_out,
            min_aleo_out,
            expected_aleo_out
        );
    }

    // Swap token1 for token2 using AMM pricing
    async transition swap_tokens(
        public token1_id: field,
        public token2_id: field,
        public token1_in: u128,
        public min_token2_out: u128,
        public expected_token2_out: u128
    ) -> Future {
        assert(token1_in > 0u128);
        assert(expected_token2_out >= min_token2_out);

        // Get caller address outside async block
        let caller_address: address = self.caller;

        // Generate pool ID
        let pool_id: field = get_pool_id(token1_id, token2_id);

        // Transfer token1 FROM user TO program
        let token1_future: Future = token_registry.aleo/transfer_public_as_signer(token1_id, self.address, token1_in);

        let token2_future: Future = token_registry.aleo/transfer_public(token2_id, caller_address, expected_token2_out);
        
        return finalize_swap_token_output(
            token1_future,
            token2_future,
            pool_id,
            caller_address,
            token1_id,
            token2_id,
            token1_in,
            expected_token2_out,
            min_token2_out,
            expected_token2_out
        );
    }

    // Finalize: Handle liquidity addition and state updates
    async function finalize_add_liquidity(
        future_a: Future,
        future_b: Future,
        pool_id: field,
        caller_address: address,
        token_low_id: field,
        token_high_id: field,
        amount_low: u128,
        amount_high: u128,
        min_lp: u128
    ) {
        future_a.await();
        future_b.await();

        // Load pool
        let pool_exists_flag: bool = Mapping::get_or_use(pool_exists, pool_id, false);
        assert(pool_exists_flag);

        let current_pool: PoolInfo = Mapping::get(pools, pool_id);
        assert(current_pool.id != 0field);
        assert(current_pool.token1_id == token_low_id);
        assert(current_pool.token2_id == token_high_id);

        if current_pool.lp_total_supply == 0u128 {
            assert(current_pool.reserve1 == 0u128);
            assert(current_pool.reserve2 == 0u128);
            let product: u128 = amount_low * amount_high;
            let lp_to_mint: u128 = sqrt_approx(product);
            assert(lp_to_mint >= min_lp);

            let updated_bootstrap: PoolInfo = PoolInfo {
                id: current_pool.id,
                token1_id: current_pool.token1_id,
                token2_id: current_pool.token2_id,
                reserve1: amount_low,
                reserve2: amount_high,
                lp_total_supply: lp_to_mint,
                swap_fee: current_pool.swap_fee,
                pool_type: current_pool.pool_type,
            };
            Mapping::set(pools, pool_id, updated_bootstrap);

            let position_key_bootstrap: field = get_position_key(caller_address, pool_id);
            let user_position_bootstrap: LiquidityPosition = Mapping::get_or_use(
                liquidity_positions,
                position_key_bootstrap,
                LiquidityPosition {
                    user_address: caller_address,
                    pool_id: pool_id,
                    lp_tokens: 0u128,
                    timestamp: 0u64,
                }
            );
            let new_lp_tokens_bootstrap: u128 = user_position_bootstrap.lp_tokens + lp_to_mint;
            let updated_position_bootstrap: LiquidityPosition = LiquidityPosition {
                user_address: caller_address,
                pool_id: pool_id,
                lp_tokens: new_lp_tokens_bootstrap,
                timestamp: 0u64,
            };
            Mapping::set(liquidity_positions, position_key_bootstrap, updated_position_bootstrap);
            return;
        }

        assert(current_pool.reserve1 > 0u128);
        assert(current_pool.reserve2 > 0u128);
        let lp_from_token_low: u128 = (amount_low * current_pool.lp_total_supply) / current_pool.reserve1;
        let lp_from_token_high: u128 = (amount_high * current_pool.lp_total_supply) / current_pool.reserve2;
        let lp_to_mint: u128 = lp_from_token_high < lp_from_token_low ? lp_from_token_high : lp_from_token_low;
        assert(lp_to_mint >= min_lp);
        assert(lp_to_mint > 0u128);

        let new_reserve1: u128 = current_pool.reserve1 + amount_low;
        let new_reserve2: u128 = current_pool.reserve2 + amount_high;
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
        payout_low_future: Future,
        payout_high_future: Future,
        pool_id: field,
        caller_address: address,
        token_low_id: field,
        token_high_id: field,
        lp_tokens_to_burn: u128,
        low_out: u128,
        high_out: u128,
        min_low_out: u128,
        min_high_out: u128,
        user_expected_low: u128,
        user_expected_high: u128
    ) {
        let pool_exists_flag: bool = Mapping::get_or_use(pool_exists, pool_id, false);
        assert(pool_exists_flag);

        let current_pool: PoolInfo = Mapping::get(pools, pool_id);
        assert(current_pool.id != 0field);
        assert(current_pool.token1_id == token_low_id);
        assert(current_pool.token2_id == token_high_id);
        assert(lp_tokens_to_burn > 0u128);
        assert(current_pool.lp_total_supply >= lp_tokens_to_burn);

        let computed_low: u128 = (current_pool.reserve1 * lp_tokens_to_burn) / current_pool.lp_total_supply;
        let computed_high: u128 = (current_pool.reserve2 * lp_tokens_to_burn) / current_pool.lp_total_supply;

        assert(computed_low >= min_low_out);
        assert(computed_high >= min_high_out);
        assert(low_out >= min_low_out);
        assert(high_out >= min_high_out);

        if user_expected_low > 0u128 {
            let max_low: u128 = (computed_low * 101u128) / 100u128;
            assert(user_expected_low <= max_low);
        }
        if user_expected_high > 0u128 {
            let max_high: u128 = (computed_high * 101u128) / 100u128;
            assert(user_expected_high <= max_high);
        }

        assert(low_out <= computed_low);
        assert(high_out <= computed_high);
        assert(current_pool.reserve1 >= low_out);
        assert(current_pool.reserve2 >= high_out);

        let new_reserve1: u128 = current_pool.reserve1 - low_out;
        let new_reserve2: u128 = current_pool.reserve2 - high_out;
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
        assert(user_position.lp_tokens >= lp_tokens_to_burn);

        let new_lp_tokens: u128 = user_position.lp_tokens - lp_tokens_to_burn;
        let updated_position: LiquidityPosition = LiquidityPosition {
            user_address: caller_address,
            pool_id: pool_id,
            lp_tokens: new_lp_tokens,
            timestamp: 0u64,
        };
        Mapping::set(liquidity_positions, position_key, updated_position);

        if token_low_id == NATIVE_ALEO_ID {
            assert(low_out <= 18446744073709551615u128);
        }
        if token_high_id == NATIVE_ALEO_ID {
            assert(high_out <= 18446744073709551615u128);
        }

        payout_low_future.await();
        payout_high_future.await();
    }

    // Finalize: Handle swap calculations and state updates for token1 to token2
    async function finalize_swap_token_output(
        incoming_future: Future,
        outgoing_future: Future,
        pool_id: field,
        caller: address,
        input_token_id: field,
        output_token_id: field,
        amount_in: u128,
        amount_out: u128,
        min_amount_out: u128,
        user_expected_out: u128
    ) {
        incoming_future.await();
        
        let pool_exists_flag: bool = Mapping::get_or_use(pool_exists, pool_id, false);
        assert(pool_exists_flag);

        let pool: PoolInfo = Mapping::get(pools, pool_id);
        assert(pool.id != 0field);
        
        let input_is_low: bool = pool.token1_id == input_token_id;
        let output_is_low: bool = pool.token1_id == output_token_id;
        assert(input_is_low || pool.token2_id == input_token_id);
        assert(output_is_low || pool.token2_id == output_token_id);
        assert(input_token_id != output_token_id);
        
        let reserve_in: u128 = input_is_low ? pool.reserve1 : pool.reserve2;
        let reserve_out: u128 = input_is_low ? pool.reserve2 : pool.reserve1;
        assert(reserve_out > 0u128);
        
        let computed_out: u128 = get_amount_out(amount_in, reserve_in, reserve_out, pool.swap_fee);
        assert(computed_out >= min_amount_out);
        assert(computed_out <= reserve_out);
        
        if user_expected_out > 0u128 {
            let max_expected: u128 = (computed_out * 101u128) / 100u128;
            assert(user_expected_out <= max_expected);
        }
        
        assert(amount_out <= computed_out);
        assert(amount_out > 0u128);
        
        let new_low_reserve: u128 = input_is_low ? (pool.reserve1 + amount_in) : (pool.reserve1 - amount_out);
        let new_high_reserve: u128 = input_is_low ? (pool.reserve2 - amount_out) : (pool.reserve2 + amount_in);
        
        let updated_pool: PoolInfo = PoolInfo {
            id: pool.id,
            token1_id: pool.token1_id,
            token2_id: pool.token2_id,
            reserve1: new_low_reserve,
            reserve2: new_high_reserve,
            lp_total_supply: pool.lp_total_supply,
            swap_fee: pool.swap_fee,
            pool_type: pool.pool_type,
        };
        Mapping::set(pools, pool_id, updated_pool);
        
        outgoing_future.await();
    }

    async function finalize_swap_aleo_output(
        incoming_future: Future,
        outgoing_future: Future,
        pool_id: field,
        caller: address,
        input_token_id: field,
        amount_in: u128,
        amount_out: u128,
        min_amount_out: u128,
        user_expected_out: u128
    ) {
        incoming_future.await();
        
        let pool_exists_flag: bool = Mapping::get_or_use(pool_exists, pool_id, false);
        assert(pool_exists_flag);

        let pool: PoolInfo = Mapping::get(pools, pool_id);
        assert(pool.id != 0field);
        
        let input_is_low: bool = pool.token1_id == input_token_id;
        assert(input_is_low || pool.token2_id == input_token_id);
        
        let reserve_in: u128 = input_is_low ? pool.reserve1 : pool.reserve2;
        let reserve_out: u128 = input_is_low ? pool.reserve2 : pool.reserve1;
        assert(reserve_out > 0u128);
        
        let computed_out: u128 = get_amount_out(amount_in, reserve_in, reserve_out, pool.swap_fee);
        assert(computed_out >= min_amount_out);
        assert(computed_out <= reserve_out);
        
        if user_expected_out > 0u128 {
            let max_expected: u128 = (computed_out * 101u128) / 100u128;
            assert(user_expected_out <= max_expected);
        }
        
        assert(amount_out <= computed_out);
        assert(amount_out > 0u128);
        assert(amount_out <= 18446744073709551615u128);
        
        let new_low_reserve: u128 = input_is_low ? (pool.reserve1 + amount_in) : (pool.reserve1 - amount_out);
        let new_high_reserve: u128 = input_is_low ? (pool.reserve2 - amount_out) : (pool.reserve2 + amount_in);
        
        let updated_pool: PoolInfo = PoolInfo {
            id: pool.id,
            token1_id: pool.token1_id,
            token2_id: pool.token2_id,
            reserve1: new_low_reserve,
            reserve2: new_high_reserve,
            lp_total_supply: pool.lp_total_supply,
            swap_fee: pool.swap_fee,
            pool_type: pool.pool_type,
        };
        Mapping::set(pools, pool_id, updated_pool);
        
        outgoing_future.await();
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
        
        // Canonical ordering
        let token_low: field = token1_id < token2_id ? token1_id : token2_id;
        let token_high: field = token1_id < token2_id ? token2_id : token1_id;
        let amount_low: u128 = token1_id == token_low ? token1_amount : token2_amount;
        let amount_high: u128 = token1_id == token_low ? token2_amount : token1_amount;
        
        // Validate ratio
        let ratio: u128 = amount_high > amount_low ? (amount_high / amount_low) : (amount_low / amount_high);
        assert(ratio <= MAX_INITIAL_RATIO);
        
        // Calculate LP tokens (geometric mean)
        let lp: u128 = sqrt_approx(amount_low * amount_high);
        assert(lp >= min_lp);
        
        // Create pool
        let pool: PoolInfo = PoolInfo {
            id: pool_id,
            token1_id: token_low,
            token2_id: token_high,
            reserve1: amount_low,
            reserve2: amount_high,
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
