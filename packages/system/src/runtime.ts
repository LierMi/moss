import {
  createRuntime,
  MONAD_MAINNET_CHAIN_ID,
  MONAD_TESTNET_CHAIN_ID,
  type MossRuntime,
} from "@themoss/core";

export const MONAD_CHAIN_ID = MONAD_MAINNET_CHAIN_ID;
export const DEFAULT_RPC_URL = "https://rpc.monad.xyz";
export { MONAD_TESTNET_CHAIN_ID };
export const DEFAULT_TESTNET_RPC_URL = "https://testnet-rpc.monad.xyz";

/** Creates a Monad mainnet runtime and rejects RPC endpoints for any other chain. */
export function monadRuntime(opts: { rpcUrl?: string } = {}): Promise<MossRuntime> {
  return createRuntime({ rpcUrl: opts.rpcUrl ?? DEFAULT_RPC_URL });
}

/** Creates a Monad testnet runtime and rejects RPC endpoints for any other chain. */
export function monadTestnetRuntime(opts: { rpcUrl?: string } = {}): Promise<MossRuntime> {
  return createRuntime({
    rpcUrl: opts.rpcUrl ?? DEFAULT_TESTNET_RPC_URL,
    expectedChainId: MONAD_TESTNET_CHAIN_ID,
  });
}
