import { createPublicClient, http, type PublicClient } from "viem";

export const MONAD_MAINNET_CHAIN_ID = 143;
export const MONAD_TESTNET_CHAIN_ID = 10_143;

export type MonadChainId = typeof MONAD_MAINNET_CHAIN_ID | typeof MONAD_TESTNET_CHAIN_ID;

export interface MossRuntime {
  rpcUrl: string;
  /** Selected Monad network. Legacy manually constructed runtimes default to mainnet. */
  chainId?: MonadChainId;
  client: PublicClient;
}

export async function createRuntime(opts: {
  rpcUrl: string;
  expectedChainId?: MonadChainId;
}): Promise<MossRuntime> {
  const expectedChainId = opts.expectedChainId ?? MONAD_MAINNET_CHAIN_ID;
  if (expectedChainId !== MONAD_MAINNET_CHAIN_ID && expectedChainId !== MONAD_TESTNET_CHAIN_ID) {
    throw new Error(
      `Moss supports Monad mainnet chain ID ${MONAD_MAINNET_CHAIN_ID} and testnet chain ID ${MONAD_TESTNET_CHAIN_ID}; requested ${expectedChainId}`,
    );
  }
  const client = createPublicClient({ transport: http(opts.rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== expectedChainId) {
    const network = expectedChainId === MONAD_MAINNET_CHAIN_ID ? "mainnet" : "testnet";
    throw new Error(
      `Moss requires Monad ${network} chain ID ${expectedChainId}; RPC reported ${chainId}`,
    );
  }
  return { rpcUrl: opts.rpcUrl, chainId: expectedChainId, client };
}
