import { parseUnits } from "viem";
import {
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  PositiveDecimalString,
  Protocol,
  type ReceiptResult,
  Receipt,
  UnsignedIntegerString,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { TaskEscrowAbi } from "./abis/taskEscrow.js";

// Deployed on Monad Testnet (chain ID 10143), block 49534792.
// Deployment manifest: deployments/monad-testnet.json in the product repo.
export const TASK_ESCROW_ADDRESS: AddressValue =
  "0x67040374b8A9756586De0885f01d1291cE8FFCcF";

const createTaskParams = {
  amount: {
    type: PositiveDecimalString,
    description:
      "Human-readable native MON amount to escrow. MON uses 18 decimals.",
  },
  requirementsHash: {
    type: UnsignedIntegerString,
    description:
      "Keccak-256 hash of the canonical requirements payload agreed before signing. Moss accepts any non-negative integer string; the upstream caller normalizes bytes32 → bigint for submission and the contract treats it as a bytes32 value.",
  },
  deadline: {
    type: UnsignedIntegerString,
    description:
      "Unix timestamp after which delivery is late and the task may be refunded.",
  },
} as const;

type TaskCreatedOutcome = {
  taskId: AddressValue;
  client: AddressValue;
  amount: string;
  reqHash: AddressValue;
  deadline: string;
};

@Protocol({
  name: "silicon-arbitration",
  category: "token",
  description:
    "Create an escrowed Agent-work task with locked MON and committed requirements on Silicon Labor Arbitration.",
  contracts: {
    taskEscrow: { abi: TaskEscrowAbi, addr: TASK_ESCROW_ADDRESS },
  },
  labels: { TaskEscrow: TASK_ESCROW_ADDRESS },
})
export class SiliconArbitrationProtocol {
  declare taskEscrow: Handle<typeof TaskEscrowAbi>;

  @Capability<SiliconArbitrationProtocol, typeof createTaskParams>({
    intent:
      "Create a funded escrow task that commits requirements on-chain before the Agent begins work.",
    verb: "transfer",
    params: createTaskParams,
    receipt: "taskCreatedReceipt",
    risk: ["fundOut"],
    tags: [
      "task-creation",
      "escrow",
      "agent-work",
      "arbitration",
      "domainAction=commission",
      "semanticMappingVersion=create-task-v1",
      "semanticFidelity=coarse-verb",
    ],
  })
  async createTask(params: InferParams<typeof createTaskParams>) {
    const requirementsHash = `0x${BigInt(params.requirementsHash).toString(16).padStart(64, "0")}` as `0x${string}`;
    const deadline = BigInt(params.deadline);
    const value = parseUnits(params.amount, 18);
    return [
      this.taskEscrow.createTask([requirementsHash, deadline], { value }),
    ];
  }

  @Receipt()
  taskCreatedReceipt(
    changes: readonly Change[],
  ): ReceiptResult<TaskCreatedOutcome> {
    let event: TaskCreatedOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        return {
          kind: "change" as const,
          change,
          data: {
            operation: "nativeTransfer",
            value: change.value,
            from: change.from,
            to: change.to,
          },
          text: `Escrow deposit: ${change.value} MON from ${change.from}`,
        };
      }

      let decoded: ReturnType<
        typeof decodeEventLog<typeof TaskEscrowAbi>
      >;
      try {
        decoded = decodeEventLog({
          abi: TaskEscrowAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error(
          "Unexpected Change: unsupported TaskEscrow event",
        );
      }

      if (decoded.eventName !== "TaskCreated" || event) {
        throw new Error(
          `Unexpected Change: TaskEscrow emitted ${decoded.eventName}`,
        );
      }

      event = {
        taskId: decoded.args.taskId,
        client: decoded.args.client,
        amount: decoded.args.amount.toString(),
        reqHash: decoded.args.reqHash,
        deadline: decoded.args.deadline.toString(),
      };

      return {
        kind: "change" as const,
        change,
        data: event,
        text: `Task ${decoded.args.taskId} created: ${decoded.args.amount} MON escrowed, deadline ${decoded.args.deadline}`,
      };
    });

    if (!event) {
      throw new Error("createTask receipt missing TaskCreated event");
    }

    return {
      kind: "receipt",
      outcome: event,
      text: `Task ${event.taskId} created by ${event.client}: ${event.amount} MON escrowed`,
      changes: parsed,
    };
  }
}
