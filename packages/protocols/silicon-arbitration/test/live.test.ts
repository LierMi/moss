/**
 * Live simulation of createTask against the deployed TaskEscrow on Monad Testnet.
 *
 * npx vitest run --config vitest.live.config.ts
 *
 * Requires the Monad Testnet RPC to support debug_traceCall.
 */
import type {
  CapabilityNode,
  TransactionSimulation,
} from "@themoss/core";
import { Registry } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { monadTestnetRuntime } from "@themoss/system";
import { describe, it, expect } from "vitest";
import * as siliconArbitration from "../src/index.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const RPC_URL =
  process.env.MOSS_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";

describe("Live simulation", () => {
  it(
    "simulates createTask against deployed TaskEscrow on Monad Testnet",
    async () => {
      const runtime = await monadTestnetRuntime({ rpcUrl: RPC_URL });
      const registry = new Registry(runtime).use(siliconArbitration);

      const deadline = String(Math.floor(Date.now() / 1000) + 3600);
      const capability = await registry.action(
        "silicon-arbitration",
        "createTask",
        ACCOUNT,
        { amount: "0.1", requirementsHash: "1234", deadline }
      );

      if (capability.kind !== "capability") {
        throw new Error(`expected capability, got ${capability.kind}`);
      }

      const simulator = createTraceSimulator(runtime, {
        receipt: (_, changes) =>
          registry.parseReceipt(capability as CapabilityNode, changes),
      });
      const outcome = await simulator.simulate(capability);

      for (const result of outcome.results) {
        console.log(`\nProtocol: ${result.protocol}`);
        console.log(`Method:   ${result.method}`);
        console.log(`Reverted: ${result.reverted}`);
        console.log(`Gas:      ${result.gas}`);
        console.log(`Warnings: ${result.warnings.length}`);

        for (const w of result.warnings) {
          console.log(`  [${w.code}] ${w.message}`);
        }

        if (result.receipt) {
          console.log(
            `Receipt outcome: ${JSON.stringify(result.receipt.outcome)}`
          );
        }
      }

      // All transactions must have no warnings
      const allWarnings = outcome.results.flatMap((r) => r.warnings);
      expect(allWarnings).toHaveLength(0);

      // No transaction must be reverted
      const reverted = outcome.results.filter((r) => r.reverted);
      expect(reverted).toHaveLength(0);

      // At least one transaction must have a receipt
      const withReceipt = outcome.results.filter((r) => r.receipt);
      expect(withReceipt.length).toBeGreaterThan(0);

      console.log(`\n✅ Live simulation passed: no warnings, no reverts`);
    },
    60_000
  );
});
