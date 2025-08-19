import { JSONRPCClient } from 'json-rpc-2.0';
import { PROGRAM_ID } from '@/types';
import { CURRENT_RPC_URL } from '@/types';


export const CREDITS_PROGRAM_ID = 'credits.aleo';

// Create the JSON-RPC client
export const client = getClient(CURRENT_RPC_URL);


// returns a string for address-based mappings
export async function fetchMappingValueString(
  mappingName: string,
  key: number
): Promise<string> {
  try {
    const result = await client.request('getMappingValue', {
      programId: PROGRAM_ID,
      mappingName,
      key: `${key}.public`,
    });
    return result.value; // The address is stored as string in 'result.value'
  } catch (error) {
    console.error(`Failed to fetch mapping ${mappingName} with key ${key}:`, error);
    throw error;
  }
}

export async function fetchMappingValueRaw(
  mappingName: string,
  key: string
): Promise<string> {
  try {

    const keyString = `${key}u64`;

    const result = await client.request("getMappingValue", {
      program_id: PROGRAM_ID,
      mapping_name: mappingName,
      key: keyString,
    });

    if (!result) {
      throw new Error(
        `No result returned for mapping "${mappingName}" and key "${keyString}"`
      );
    }

    return result;
  } catch (error) {
    console.error(`Failed to fetch mapping "${mappingName}" with key "${key}":`, error);
    throw error;
  }
}


/**
 * Utility to fetch program transactions
 */
export async function getProgramTransactions(
  functionName: string,
  page = 0,
  maxTransactions = 100
) {
  return client.request('aleoTransactionsForProgram', {
    programId: PROGRAM_ID,
    functionName,
    page,
    maxTransactions,
  });
}


export async function waitForTransactionToFinalize(
  transactionId: string
): Promise<boolean> {
  const maxRetries = 30;
  const delay = 1000; // 1 second
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const status = await client.request('getTransactionStatus', { id: transactionId });
      if (status === 'finalized') {
        return true;
      }
    } catch (error) {
      console.error(`Failed to get transaction status: ${error}`);
    }
    retries++;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return false; // Return false if transaction is not finalized
}



/**
 * Helper to Fetch Mapping Values
 */
export async function fetchMappingValue(
  mappingName: string,
  key: string | number // Allow both string and number
): Promise<number> {
  try {
    // Convert `key` to string if it's a number
    const keyString = typeof key === 'number' ? `${key}.public` : `${key}.public`;

    const result = await client.request('getMappingValue', {
      programId: PROGRAM_ID,
      mappingName,
      key: keyString, // Always pass as a string
    });

    return parseInt(result.value, 10); // Parse as integer
  } catch (error) {
    console.error(
      `Failed to fetch mapping ${mappingName} with key ${key}:`,
      error
    );
    throw error;
  }
}

/**
 * Utility to Create JSON-RPC Client
 */
export function getClient(apiUrl: string): JSONRPCClient {
  const client: JSONRPCClient = new JSONRPCClient((jsonRPCRequest: any) =>
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(jsonRPCRequest),
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((jsonRPCResponse) =>
          client.receive(jsonRPCResponse)
        );
      }
      throw new Error(response.statusText);
    })
  );
  return client;
}

/**
 * Get Verifying Key for a Function
 */
async function getDeploymentTransaction(programId: string): Promise<any> {
  const response = await fetch(`${CURRENT_RPC_URL}find/transactionID/deployment/${programId}`);
  const deployTxId = await response.json();
  const txResponse = await fetch(`${CURRENT_RPC_URL}transaction/${deployTxId}`);
  const tx = await txResponse.json();
  return tx;
}

export async function getVerifyingKey(
  programId: string,
  functionName: string
): Promise<string> {
  const deploymentTx = await getDeploymentTransaction(programId);

  const allVerifyingKeys = deploymentTx.deployment.verifying_keys;
  const verifyingKey = allVerifyingKeys.filter((vk: any) => vk[0] === functionName)[0][1][0];
  return verifyingKey;
}

export async function getProgram(programId: string, apiUrl: string): Promise<string> {
  const client = getClient(apiUrl);
  const program = await client.request('program', {
    id: programId
  });
  return program;
}
