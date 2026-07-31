import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { TaskEscrowAbi } from "../src/abis/taskEscrow.js";
import {
  TASK_ESCROW_ADDRESS,
  SiliconArbitrationProtocol,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = {
  rpcUrl: "http://offline",
  client: {} as MossRuntime["client"],
};

describe("Protocol silicon-arbitration", () => {
  it("registers and builds one createTask transaction", async () => {
    const registry = new Registry(runtime).use(SiliconArbitrationProtocol);
    const capability = await registry.action(
      "silicon-arbitration",
      "createTask",
      ACCOUNT,
      {
        amount: "1",
        requirementsHash: "1234",
        deadline: "1000000000",
      }
    );

    if (capability.kind !== "capability")
      throw new Error("expected capability");
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      to: TASK_ESCROW_ADDRESS,
      value: "0xde0b6b3a7640000",
    });
  });

  it("parses a TaskCreated change with nativeTransfer", async () => {
    const registry = new Registry(runtime).use(SiliconArbitrationProtocol);
    const capability = await registry.action(
      "silicon-arbitration",
      "createTask",
      ACCOUNT,
      {
        amount: "1",
        requirementsHash: "1234",
        deadline: "1000000000",
      }
    );
    if (capability.kind !== "capability") {
      throw new Error("expected capability");
    }

    const taskId =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab";
    const amount = 10n ** 17n; // 0.1 MON
    const reqHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const deadline = 1000000000n;

    const native: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: TASK_ESCROW_ADDRESS,
      value: amount.toString(),
    };

    const taskCreated: Change = {
      kind: "event",
      address: TASK_ESCROW_ADDRESS,
      topics: encodeEventTopics({
        abi: TaskEscrowAbi,
        eventName: "TaskCreated",
        args: { taskId, client: ACCOUNT },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "bytes32" },
          { type: "uint256" },
        ],
        [amount, reqHash, deadline]
      ),
    };

    const receipt = registry.parseReceipt(capability, [
      native,
      taskCreated,
    ]);

    expect(receipt).toHaveProperty("outcome");
    expect(receipt.outcome).toMatchObject({
      taskId,
      client: ACCOUNT,
      amount: amount.toString(),
      reqHash,
      deadline: deadline.toString(),
    });
  });

  it("rejects a receipt missing the TaskCreated event", async () => {
    const registry = new Registry(runtime).use(SiliconArbitrationProtocol);
    const capability = await registry.action(
      "silicon-arbitration",
      "createTask",
      ACCOUNT,
      {
        amount: "1",
        requirementsHash: "1234",
        deadline: "1000000000",
      }
    );
    if (capability.kind !== "capability") {
      throw new Error("expected capability");
    }

    const native: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: TASK_ESCROW_ADDRESS,
      value: "100000000000000000",
    };

    expect(() => {
      registry.parseReceipt(capability, [native]);
    }).toThrow(/missing TaskCreated/);
  });
});
