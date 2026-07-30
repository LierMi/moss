import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntime } from "../src/runtime.js";

afterEach(() => vi.restoreAllMocks());

function mockChainId(chainId: number) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as { id: number };
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: request.id, result: `0x${chainId.toString(16)}` }),
      { headers: { "content-type": "application/json" } },
    );
  });
}

describe("createRuntime", () => {
  it("accepts Monad mainnet chain ID 143", async () => {
    mockChainId(143);
    await expect(createRuntime({ rpcUrl: "http://rpc.test" })).resolves.toMatchObject({
      rpcUrl: "http://rpc.test",
      chainId: 143,
    });
  });

  it("accepts Monad testnet chain ID 10143 when explicitly selected", async () => {
    mockChainId(10_143);
    await expect(
      createRuntime({ rpcUrl: "http://rpc.test", expectedChainId: 10_143 }),
    ).resolves.toMatchObject({
      rpcUrl: "http://rpc.test",
      chainId: 10_143,
    });
  });

  it("rejects every other chain ID", async () => {
    mockChainId(1);
    await expect(createRuntime({ rpcUrl: "http://rpc.test" })).rejects.toThrow(
      "requires Monad mainnet chain ID 143; RPC reported 1",
    );
  });

  it("rejects a testnet RPC when the mainnet default is used", async () => {
    mockChainId(10_143);
    await expect(createRuntime({ rpcUrl: "http://rpc.test" })).rejects.toThrow(
      "requires Monad mainnet chain ID 143; RPC reported 10143",
    );
  });

  it("rejects a mainnet RPC when testnet is selected", async () => {
    mockChainId(143);
    await expect(
      createRuntime({ rpcUrl: "http://rpc.test", expectedChainId: 10_143 }),
    ).rejects.toThrow("requires Monad testnet chain ID 10143; RPC reported 143");
  });

  it("rejects unsupported expected chain IDs from untyped callers", async () => {
    await expect(
      Reflect.apply(createRuntime, undefined, [{ rpcUrl: "http://rpc.test", expectedChainId: 1 }]),
    ).rejects.toThrow(
      "supports Monad mainnet chain ID 143 and testnet chain ID 10143; requested 1",
    );
  });
});
