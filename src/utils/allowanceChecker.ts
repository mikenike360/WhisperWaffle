// Utility functions for checking token allowances
// Uses the same hash computation pattern as balance fetching

export interface AllowanceData {
  approved: boolean;
  allowance: any | null;
  message: string;
}

/**
 * Check if a token is approved for spending by a specific spender
 * @param tokenId - The token ID to check
 * @param owner - The token owner's address
 * @param spender - The spender's address (usually the DEX program)
 * @returns Promise<AllowanceData> - Approval status and details
 */
export async function checkTokenAllowance(
  tokenId: string,
  owner: string,
  spender: string
): Promise<AllowanceData> {
  try {
    console.log('Checking allowance for:', { tokenId, owner, spender });
    
    // Query the allowance API endpoint with proper parameters
    const url = `/api/allowance?tokenId=${encodeURIComponent(tokenId)}&account=${encodeURIComponent(owner)}&spender=${encodeURIComponent(spender)}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Failed to check allowance:', response.status, errorData);
      return {
        approved: false,
        allowance: null,
        message: `Failed to check allowance: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Error checking token allowance:', error);
    return {
      approved: false,
      allowance: null,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if both wALEO and wUSDC are approved for the main swap program
 * @param owner - The user's wallet address
 * @param spender - The main swap program address
 * @returns Promise<{waleoApproved: boolean, wusdcApproved: boolean}>
 */
export async function checkBothTokenAllowances(
  owner: string,
  spender: string
): Promise<{waleoApproved: boolean, wusdcApproved: boolean}> {
  try {
    // Check wALEO allowance
    const waleoAllowance = await checkTokenAllowance(
      '68744147421264673966385360field', // wALEO token ID
      owner,
      spender
    );
    
    // Check wUSDC allowance
    const wusdcAllowance = await checkTokenAllowance(
      '42069187360666field', // wUSDC token ID
      owner,
      spender
    );
    
    return {
      waleoApproved: waleoAllowance.approved,
      wusdcApproved: wusdcAllowance.approved
    };
  } catch (error) {
    console.error('Error checking both token allowances:', error);
    return {
      waleoApproved: false,
      wusdcApproved: false
    };
  }
}
