import credits.aleo;
import token_registry.aleo;

program ww_swap_v3.aleo {
    // USDC token ID on Aleo (as provided)
    const VUSDC_ID: field = 3443843282313283355522573239085696902919850365217539366784739393210722344986field;

    struct Pair {
        reserve_aleo: u128,
        reserve_usdc: u128,
        total_liquidity: u128, // Track total liquidity for LP tokens
    }

    struct LiquidityPosition {
        aleo_amount: u128,
        usdc_amount: u128,
        lp_tokens: u128,
        timestamp: u64,
    }

    // Pool state is stored in mapping `pool_state` keyed by a single byte `0u8`.
    mapping pool_state: u8 => Pair;
    
    // User liquidity positions are stored in mapping `user_positions` keyed by user address.
    mapping user_positions: address => LiquidityPosition;

    // This constructor is required for all Leo programs
    // @noupgrade makes the program non-upgradable
    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic
    }

    // Initialize the pool with starting reserves
    async transition initialise_pool(
        public aleo_in: u64,
        public usdc_in: u128
    ) -> Future {
        let new_ra: u128 = aleo_in as u128;
        let new_rb: u128 = usdc_in;
        
        // Ensure minimum initial liquidity
        assert(new_ra > 0u128 && new_rb > 0u128);
        
        let total_liquidity: u128 = new_ra + new_rb; // Simple LP token calculation

        return async {
            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128, total_liquidity: 0u128 }
            );
            assert(current.reserve_aleo == 0u128 && current.reserve_usdc == 0u128);
            
            // Set initial pool state
            Mapping::set(pool_state, 0u8, Pair { 
                reserve_aleo: new_ra, 
                reserve_usdc: new_rb, 
                total_liquidity: total_liquidity 
            });
        };
    }

    // Add liquidity to an existing pool with slippage protection
    async transition add_liquidity(
        public aleo_in: u64,
        public usdc_in: u128,
        public ra: u128,
        public rb: u128,
        public min_lp_tokens: u128
    ) -> Future {
        let amount_aleo: u128 = aleo_in as u128;
        let amount_usdc: u128 = usdc_in;
        
        // Ensure positive amounts
        assert(amount_aleo > 0u128 && amount_usdc > 0u128);
        
        // Calculate new reserves
        let new_ra: u128 = ra + amount_aleo;
        let new_rb: u128 = rb + amount_usdc;
        
        return async {
            // Verify current pool state matches provided reserves
            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128, total_liquidity: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);
            assert(ra > 0u128 && rb > 0u128); // Pool must already exist
            
            // Calculate LP tokens to mint based on proportional contribution
            let current_total_liquidity: u128 = current.total_liquidity;
            let aleo_ratio: u128 = (amount_aleo * current_total_liquidity) / ra;
            let usdc_ratio: u128 = (amount_usdc * current_total_liquidity) / rb;
            let lp_tokens_to_mint: u128 = aleo_ratio < usdc_ratio ? aleo_ratio : usdc_ratio;
            
            // Ensure minimum LP tokens minted (slippage protection)
            assert(lp_tokens_to_mint >= min_lp_tokens);
            assert(lp_tokens_to_mint > 0u128);
            
            let new_total_liquidity: u128 = current_total_liquidity + lp_tokens_to_mint;
            
            // Update pool state
            Mapping::set(
                pool_state,
                0u8,
                Pair { 
                    reserve_aleo: new_ra, 
                    reserve_usdc: new_rb, 
                    total_liquidity: new_total_liquidity 
                }
            );
        };
    }

    // Remove liquidity from the pool with slippage protection
    async transition remove_liquidity(
        public lp_tokens_to_burn: u128,
        public ra: u128,
        public rb: u128,
        public min_aleo_out: u128,
        public min_usdc_out: u128
    ) -> Future {
        // Ensure positive amount
        assert(lp_tokens_to_burn > 0u128);
        
        return async {
            // Verify current pool state
            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128, total_liquidity: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);
            
            // Calculate amounts to withdraw based on LP token ratio
            let total_liquidity: u128 = current.total_liquidity;
            let aleo_to_withdraw: u128 = (lp_tokens_to_burn * ra) / total_liquidity;
            let usdc_to_withdraw: u128 = (lp_tokens_to_burn * rb) / total_liquidity;
            
            // Slippage protection
            assert(aleo_to_withdraw >= min_aleo_out);
            assert(usdc_to_withdraw >= min_usdc_out);
            
            // Calculate new reserves
            let new_ra: u128 = ra - aleo_to_withdraw;
            let new_rb: u128 = rb - usdc_to_withdraw;
            let new_total_liquidity: u128 = total_liquidity - lp_tokens_to_burn;
            
            // Update pool state
            Mapping::set(
                pool_state,
                0u8,
                Pair { 
                    reserve_aleo: new_ra, 
                    reserve_usdc: new_rb, 
                    total_liquidity: new_total_liquidity 
                }
            );
        };
    }

    // Swap public ALEO for private USDC.
    async transition swap_public_for_private(
        public aleo_in: u64,
        public ra: u128,
        public rb: u128,
        min_out: u128,
        recipient: address
    ) -> Future {
        let amount_in: u128 = aleo_in as u128;
        assert(ra > 0u128 && rb > 0u128);
        assert(amount_in > 0u128);

        let in_fee: u128 = amount_in * 997u128;
        let out_amt: u128 = (in_fee * rb) / (ra * 1000u128 + in_fee);
        
        // Safety checks
        assert(out_amt >= min_out);
        assert(out_amt < rb); // Cannot output more than reserve
        assert(out_amt > 0u128);

        let new_ra: u128 = ra + amount_in;
        let new_rb: u128 = rb - out_amt;

        // Call external async transition; destructure (Token, Future).
        let (ignored_token, f_transfer) = token_registry.aleo/transfer_public_to_private(
            VUSDC_ID,
            recipient,
            out_amt,
            false
        );

        // Return one async Future that first performs the external transfer, then updates state.
        return async {
            f_transfer.await();

            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128, total_liquidity: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);

            Mapping::set(
                pool_state,
                0u8,
                Pair { 
                    reserve_aleo: new_ra, 
                    reserve_usdc: new_rb, 
                    total_liquidity: current.total_liquidity 
                }
            );
        };
    }

    // Swap private credits for private USDC.
    async transition swap_private_for_private(
        private credit_in: credits.aleo/credits,
        public ra: u128,
        public rb: u128,
        min_out: u128,
        recipient: address
    ) -> Future {
        let amount_in: u128 = credit_in.microcredits as u128;
        assert(ra > 0u128 && rb > 0u128);
        assert(amount_in > 0u128);

        let in_fee: u128 = amount_in * 997u128;
        let out_amt: u128 = (in_fee * rb) / (ra * 1000u128 + in_fee);
        
        // Safety checks
        assert(out_amt >= min_out);
        assert(out_amt < rb); // Cannot output more than reserve
        assert(out_amt > 0u128);

        let new_ra: u128 = ra + amount_in;
        let new_rb: u128 = rb - out_amt;

        // External async transition; destructure (Token, Future).
        let (ignored_token2, f_transfer2) = token_registry.aleo/transfer_public_to_private(
            VUSDC_ID,
            recipient,
            out_amt,
            false
        );

        return async {
            f_transfer2.await();

            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128, total_liquidity: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);

            Mapping::set(
                pool_state,
                0u8,
                Pair { 
                    reserve_aleo: new_ra, 
                    reserve_usdc: new_rb, 
                    total_liquidity: current.total_liquidity 
                }
            );
        };
    }

    // Swap public ALEO for public USDC (easier to test and use)
    async transition swap_public_for_public(
        public aleo_in: u64,
        public ra: u128,
        public rb: u128,
        public min_out: u128
    ) -> Future {
        let amount_in: u128 = aleo_in as u128;
        assert(ra > 0u128 && rb > 0u128);
        assert(amount_in > 0u128);

        let in_fee: u128 = amount_in * 997u128;
        let out_amt: u128 = (in_fee * rb) / (ra * 1000u128 + in_fee);
        
        // Safety checks
        assert(out_amt >= min_out);
        assert(out_amt < rb); // Cannot output more than reserve
        assert(out_amt > 0u128);

        let new_ra: u128 = ra + amount_in;
        let new_rb: u128 = rb - out_amt;

        // Return async future that updates the pool state
        return async {
            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128, total_liquidity: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);

            Mapping::set(
                pool_state,
                0u8,
                Pair { 
                    reserve_aleo: new_ra, 
                    reserve_usdc: new_rb, 
                    total_liquidity: current.total_liquidity 
                }
            );
        };
    }
}
