import { NATIVE, Registry } from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RPC_URL,
  DEFAULT_TESTNET_RPC_URL,
  MONAD_CHAIN_ID,
  MONAD_TESTNET_CHAIN_ID,
  monadTestnetRuntime,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");

describe("Monad runtime selection", () => {
  it("keeps mainnet and testnet configuration explicit", () => {
    expect(MONAD_CHAIN_ID).toBe(143);
    expect(DEFAULT_RPC_URL).toBe("https://rpc.monad.xyz");
    expect(MONAD_TESTNET_CHAIN_ID).toBe(10_143);
    expect(DEFAULT_TESTNET_RPC_URL).toBe("https://testnet-rpc.monad.xyz");
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Monad testnet runtime", () => {
  it("connects to chain ID 10143", { timeout: 60_000 }, async () => {
    const runtime = await monadTestnetRuntime();
    expect(runtime.chainId).toBe(MONAD_TESTNET_CHAIN_ID);
    await expect(runtime.client.getChainId()).resolves.toBe(MONAD_TESTNET_CHAIN_ID);
  });

  it("simulates a native transfer with complete Receipt coverage", {
    timeout: 120_000,
  }, async () => {
    const runtime = await monadTestnetRuntime();
    const registry = new Registry(runtime).use(ERC20);
    const capability = await registry.action("erc20", "transfer", ACCOUNT, {
      token: NATIVE,
      to: RECIPIENT,
      amount: "0.000001",
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(outcome.halted).toBeUndefined();
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toEqual({
      operation: "transfer",
      token: NATIVE,
      from: ACCOUNT.toLowerCase(),
      to: RECIPIENT.toLowerCase(),
      amount: "1000000000000",
    });
  });
});
