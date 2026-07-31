// ABI origin: compiled — Generated from TaskEscrow.sol (Silicon Labor Arbitration)
// Source: https://github.com/LierMi/Silicon-Labor-Arbitration
// Deployed address: 0x67040374b8A9756586De0885f01d1291cE8FFCcF on Monad Testnet (chain ID 10143)
// Canonical ABI hash: 0xce8965794b678d101ae433472fb8d7e536fc0254386e00fabef36aaa66b73cf5
// Frozen Moss-facing subset: only createTask and TaskCreated are in scope.
import { parseAbi } from "viem";

export const TaskEscrowAbi = parseAbi([
  "function createTask(bytes32 requirementsHash, uint256 deadline) payable returns (bytes32 taskId)",
  "event TaskCreated(bytes32 indexed taskId, address indexed client, uint256 amount, bytes32 reqHash, uint256 deadline)",
]);
