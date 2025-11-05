import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

//Change to MainnetBeta for mainnet or TestnetBeta for testnet
export const CURRENT_NETWORK: WalletAdapterNetwork = WalletAdapterNetwork.MainnetBeta;


//TESTNET_RPC_URL=https://testnetbeta.aleorpc.com
//MAINNET_RPC_URL=https://mainnet.aleorpc.com
export const CURRENT_RPC_URL = "https://mainnet.aleorpc.com";

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  authorization?: boolean;
  getLayout?: (page: ReactElement) => ReactNode;
};

// src/types/index.ts
export type ProposalData = {
  bountyId: number;
  proposalId: number;
  proposerAddress: string;
  proposalText?: string;
  fileName?: string;
  fileUrl?: string;
  status?: string;
  rewardSent?: boolean;
};

export type BountyData = {
  id: number;
  title: string;
  reward: string;
  deadline: string;
  creatorAddress: string;
  proposals?: ProposalData[];
};

// Program ID - automatically read from Leo source
export const PROGRAM_ID = 'whisper_waffle_swap_v1.aleo'; // Mainnet program name

// Native ALEO ID (field = 0field)
export const NATIVE_ALEO_ID = '0field';

// Token ID constants for curated tokens
export const TOKEN_IDS = {
  ALEO: '0field',
  vETH: '1field',      // Update with actual IDs
  pALEO: '2field',     // Update with actual IDs
  vUSDC: '3field',     // Update with actual IDs
  vUSDT: '4field',     // Update with actual IDs
  RATS: '5field',      // Update with actual IDs
  WAFFLE: '42069field',
} as const;

// Common token IDs for balance fetching
export const COMMON_TOKEN_IDS = {
  ALEO: '0field',
  TOKEN1: '1field',
  TOKEN2: '2field',
  TOKEN3: '3field',
} as const;

// Token decimals mapping
export const TOKEN_DECIMALS = {
  ALEO: 6,
  vETH: 18,
  pALEO: 6,
  vUSDC: 6,
  vUSDT: 6,
  RATS: 6,
  WAFFLE: 6,
} as const;
