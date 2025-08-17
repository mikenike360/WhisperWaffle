import credits.aleo;
import token_registry.aleo;

program ww_swap_v2.aleo {
    // USDC token ID on Aleo (as provided)
    const VUSDC_ID: field = 3443843282313283355522573239085696902919850365217539366784739393210722344986field;

    struct Pair {
        reserve_aleo: u128,
        reserve_usdc: u128,
    }

    // Pool state is stored in mapping `pool_state` keyed by a single byte `0u8`.
    mapping pool_state: u8 => Pair;

    // This constructor is required for all Leo programs
    // @noupgrade makes the program non-upgradable
    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic
    }

    // Initialize the pool with starting reserves.
    async transition initialise_pool(
        public aleo_in: u64,
        public usdc_in: u128
    ) -> Future {
        let new_ra: u128 = aleo_in as u128;
        let new_rb: u128 = usdc_in;

        return async {
            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128 }
            );
            assert(current.reserve_aleo == 0u128 && current.reserve_usdc == 0u128);
            Mapping::set(pool_state, 0u8, Pair { reserve_aleo: new_ra, reserve_usdc: new_rb });
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

        let in_fee: u128 = amount_in * 997u128;
        let out_amt: u128 = (in_fee * rb) / (ra * 1000u128 + in_fee);
        assert(out_amt >= min_out);

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
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);

            Mapping::set(
                pool_state,
                0u8,
                Pair { reserve_aleo: new_ra, reserve_usdc: new_rb }
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

        let in_fee: u128 = amount_in * 997u128;
        let out_amt: u128 = (in_fee * rb) / (ra * 1000u128 + in_fee);
        assert(out_amt >= min_out);

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
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);

            Mapping::set(
                pool_state,
                0u8,
                Pair { reserve_aleo: new_ra, reserve_usdc: new_rb }
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

        let in_fee: u128 = amount_in * 997u128;
        let out_amt: u128 = (in_fee * rb) / (ra * 1000u128 + in_fee);
        assert(out_amt >= min_out);

        let new_ra: u128 = ra + amount_in;
        let new_rb: u128 = rb - out_amt;

        // Return async future that updates the pool state
        return async {
            let current: Pair = Mapping::get_or_use(
                pool_state,
                0u8,
                Pair { reserve_aleo: 0u128, reserve_usdc: 0u128 }
            );
            assert(current.reserve_aleo == ra && current.reserve_usdc == rb);

            Mapping::set(
                pool_state,
                0u8,
                Pair { reserve_aleo: new_ra, reserve_usdc: new_rb }
            );
        };
    }
}
