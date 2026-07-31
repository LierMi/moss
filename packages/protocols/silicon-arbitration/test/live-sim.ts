#!/usr/bin/env tsx
/**
 * Live simulation of createTask against the deployed TaskEscrow on Monad Testnet.
 *
 * cd packages/protocols/silicon-arbitration
 * npx tsx test/live-sim.ts
 *
 * Requires the Monad Testnet RPC to support debug_traceCall.
 */

import { Registry } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { monadTestnetRuntime } from "@themoss/system";
import * as siliconArbitration from "../src/index.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const RPC_URL =
  process.env.MOSS_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";

async function main() {
  console.log(`RPC: ${RPC_URL}`);

  // 1. Create testnet runtime
  const runtime = await monadTestnetRuntime({ rpcUrl: RPC_URL });
  console.log(`Runtime ready`);

  // 2. Register only the silicon-arbitration Protocol
  const registry = new Registry(runtime).use(siliconArbitration);
  const catalog = registry.discover();
  console.log(
    `Registered ${catalog.length} operation(s)`
  );

  // 3. Build the createTask capability
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

  const child = capability.children[0];
  if (!child || child.kind !== "transaction") {
    throw new Error("expected transaction child");
  }
  console.log(`\nUnsigned transaction:`);
  console.log(`  to:    ${child.transaction.to}`);
  console.log(`  value: ${child.transaction.value}`);
  console.log(`  data:  ${child.transaction.data.slice(0, 66)}...`);

  // 4. Simulate
  console.log(`\n--- Running trace simulation ---`);
  const simulator = createTraceSimulator(runtime, {
    receipt: (_node, changes) => registry.parseReceipt(capability as any, changes),
  });
  const outcome = await simulator.simulate(capability);

  console.log(`Outcome kind: ${outcome.kind}`);
  for (const result of outcome.results) {
    console.log(`\n  Protocol: ${result.protocol}`);
    console.log(`  Kind:     ${result.kind}`);
    if (result.kind === "warning") {
      console.log(`  WARNING:  ${result.text}`);
    } else {
      console.log(`  Outcome:  ${JSON.stringify(result.outcome)}`);
      console.log(`  Text:     ${result.text}`);
    }
  }

  // 5. Check for warnings
  const warnings = outcome.results.filter(
    (r: any) => r.kind === "warning"
  );
  if (warnings.length > 0) {
    console.log(
      `\n❌ Simulation returned ${warnings.length} warning(s)`
    );
    process.exit(1);
  }

  console.log(`\n✅ Live simulation passed: no warnings`);
}

main().catch((err) => {
  console.error(`\nFATAL: ${String(err)}`);
  process.exit(1);
});
