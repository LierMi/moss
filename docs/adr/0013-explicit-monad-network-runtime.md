# Runtime selects one explicit Monad network

Moss supports Monad mainnet (chain ID `143`) and Monad testnet (chain ID `10143`) as explicit Runtime choices. `createRuntime` still defaults to mainnet for existing callers, while an application that deliberately selects testnet must pass `expectedChainId: 10143`; `@themoss/system` exposes this through `monadTestnetRuntime` and the default `https://testnet-rpc.monad.xyz` endpoint.

Chain identity remains a Runtime invariant rather than Capability data. Runtime reads `eth_chainId` from the configured RPC and fails before Registry composition when it does not match the selected Monad network. A deployment-specific Protocol declares one `chainId`; Registry rejects it when that value differs from Runtime. Address-free Protocols omit the field, and no Protocol gains a per-chain address map.

Bundled fixed addresses and concrete Protocol deployments remain mainnet-only unless their owning packages add separately sourced, bytecode-verified testnet deployments. Selecting `monadTestnetRuntime` does not reinterpret `@themoss/system` mainnet token constants or make Kuru, PancakeSwap, WMON, or another mainnet deployment valid on testnet: Registry rejects those mainnet Protocols during registration. A testnet composition root can register address-free Protocols and Protocol packages whose testnet deployments declare chain ID `10143` and are explicit and verified.

## Why

Testnet applications need the same unsigned-transaction construction, `debug_traceCall` simulation, ordered Change extraction, and Receipt verification as mainnet applications. Requiring those applications to bypass Runtime's chain check would weaken the fail-closed network boundary and make it easier to simulate one network while presenting a transaction for another.

An explicit two-network selection preserves the boundary:

- the application chooses mainnet or testnet once when constructing Runtime;
- Runtime verifies the RPC reports the selected chain;
- each fixed deployment declares one chain ID and Registry verifies it against Runtime;
- Capability trees remain network-agnostic and cannot override the choice.

## Rejected alternatives

- **Replace mainnet chain ID `143` with testnet `10143`.** Rejected because it silently breaks existing mainnet applications and changes the meaning of canonical constants.
- **Accept any EVM chain ID.** Rejected because Moss is Monad-specific and an arbitrary number would remove the network safety gate.
- **Put chain maps in every Protocol or Capability.** Rejected because it repeats composition state throughout serialized execution data. A fixed deployment declares one chain ID only; address-free Protocols and Capability trees declare none.
- **Treat testnet as a local mainnet fork.** Rejected because Monad testnet is an independent network with chain ID `10143`, its own state, and its own deployments.

## Consequences

- Existing `createRuntime({ rpcUrl })` and `monadRuntime()` calls remain mainnet and keep rejecting non-143 RPCs.
- Testnet callers use `monadTestnetRuntime()` or explicitly pass `expectedChainId: 10143` to Core.
- Testnet Protocol packages must declare chain ID `10143` and source and verify their own deployment addresses and ABIs.
- Registry fails before discovery when a deployment-specific Protocol does not match Runtime.
- Live testnet simulation still fails closed when the selected RPC cannot provide the ordered trace and state-diff evidence required by ADR 0002.
