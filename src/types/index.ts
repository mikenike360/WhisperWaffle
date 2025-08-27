import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

//Change to MainnetBeta for mainnet or TestnetBeta for testnet
export const CURRENT_NETWORK: WalletAdapterNetwork = WalletAdapterNetwork.TestnetBeta;


//TESTNET_RPC_URL=https://testnetbeta.aleorpc.com
//MAINNET_RPC_URL=https://mainnet.aleorpc.com
export const CURRENT_RPC_URL = "https://api.explorer.aleo.org/v1";

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
export const PROGRAM_ID = 'ww_swap_v13.aleo'; // This will be dynamically updated

// Custom token defaults (sync with program/src/main.leo TOKEN_ID and token decimals)
export const CUSTOM_TOKEN_ID = '42069187360666field'; // Updated to correct wUSDC token ID
export const CUSTOM_TOKEN_DECIMALS = 6;
