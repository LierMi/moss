---
"@themoss/core": minor
"@themoss/system": minor
"@themoss/protocol-kuru": patch
"@themoss/protocol-pancakeswap": patch
---

Add explicit Monad testnet Runtime selection with chain ID verification while
preserving the existing mainnet default. Retain selected-network identity on
Runtime and reject deployment-specific Protocols that target another chain.
