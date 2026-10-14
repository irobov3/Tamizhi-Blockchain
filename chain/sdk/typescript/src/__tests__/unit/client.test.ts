/**
 * Unit tests for the Tamizhi TypeScript SDK.
 *
 * These tests do NOT require a running network — they exercise pure in-process
 * behaviour: constructor contracts, constant shape, and amino codec registration.
 *
 * Run with:
 *   npm run test:unit
 */

import { TamizhiQueryClient, MSG_TYPE_URLS } from "../../index";
import { tamizhiAminoTypes } from "../../amino/codec";

// ---------------------------------------------------------------------------
// TamizhiQueryClient — constructor
// ---------------------------------------------------------------------------

describe("TamizhiQueryClient", () => {
  const baseConfig = {
    rpcEndpoint: "http://localhost:26657",
    restEndpoint: "http://localhost:1317",
    chainId: "tamizhi-local-1",
  };

  test("constructor does not throw with a valid config", () => {
    expect(() => new TamizhiQueryClient(baseConfig)).not.toThrow();
  });

  test("constructor does not throw when restEndpoint has a trailing slash", () => {
    const config = { ...baseConfig, restEndpoint: "http://localhost:1317/" };
    expect(() => new TamizhiQueryClient(config)).not.toThrow();
  });

  test("constructor accepts an optional gasPrice field without throwing", () => {
    const { GasPrice } = jest.requireActual<typeof import("@cosmjs/stargate")>(
      "@cosmjs/stargate"
    );
    const config = {
      ...baseConfig,
      gasPrice: GasPrice.fromString("1000utmz"),
    };
    expect(() => new TamizhiQueryClient(config)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// MSG_TYPE_URLS — shape and content
// ---------------------------------------------------------------------------

describe("MSG_TYPE_URLS", () => {
  const EXPECTED_KEYS: Array<keyof typeof MSG_TYPE_URLS> = [
    "IssueReward",
    "CreateRewardRule",
    "UpdateRewardRule",
    "RegisterNode",
    "DeregisterNode",
    "ClaimNodeReward",
    "LogAccess",
    "RaiseThreatFlag",
    "ResolveThreatFlag",
    "RegisterSession",
    "CreateGroup",
  ];

  test.each(EXPECTED_KEYS)('contains key "%s"', (key) => {
    expect(MSG_TYPE_URLS).toHaveProperty(key);
  });

  test("all type URLs start with a forward slash", () => {
    for (const [key, url] of Object.entries(MSG_TYPE_URLS)) {
      expect(url).toMatch(/^\//, `MSG_TYPE_URLS.${key} should start with '/'`);
    }
  });

  test("IssueReward points to the correct proto path", () => {
    expect(MSG_TYPE_URLS.IssueReward).toBe(
      "/tamizhi.rewards.v1.MsgIssueReward"
    );
  });

  test("RegisterNode points to the correct proto path", () => {
    expect(MSG_TYPE_URLS.RegisterNode).toBe(
      "/tamizhi.nodes.v1.MsgRegisterNode"
    );
  });

  test("LogAccess points to the correct proto path", () => {
    expect(MSG_TYPE_URLS.LogAccess).toBe(
      "/tamizhi.accesslog.v1.MsgLogAccess"
    );
  });
});

// ---------------------------------------------------------------------------
// tamizhiAminoTypes — codec registration
// ---------------------------------------------------------------------------

describe("tamizhiAminoTypes amino codec", () => {
  // Every message type that has an amino converter registered
  const EXPECTED_AMINO_TYPE_URLS: Array<keyof typeof tamizhiAminoTypes> = [
    "/tamizhi.rewards.v1.MsgIssueReward",
    "/tamizhi.rewards.v1.MsgCreateRewardRule",
    "/tamizhi.nodes.v1.MsgRegisterNode",
    "/tamizhi.accesslog.v1.MsgLogAccess",
    "/tamizhi.security.v1.MsgRaiseThreatFlag",
    "/tamizhi.messaging.v1.MsgRegisterSession",
  ];

  test.each(EXPECTED_AMINO_TYPE_URLS)(
    'amino converter is registered for "%s"',
    (typeUrl) => {
      expect(tamizhiAminoTypes).toHaveProperty(typeUrl);
    }
  );

  test("each registered entry has an aminoType string", () => {
    for (const [typeUrl, entry] of Object.entries(tamizhiAminoTypes)) {
      expect(typeof entry.aminoType).toBe(
        "string",
        `${typeUrl}.aminoType should be a string`
      );
      expect(entry.aminoType.length).toBeGreaterThan(0);
    }
  });

  test("each registered entry has toAmino and fromAmino functions", () => {
    for (const [typeUrl, entry] of Object.entries(tamizhiAminoTypes)) {
      expect(typeof entry.toAmino).toBe(
        "function",
        `${typeUrl}.toAmino should be a function`
      );
      expect(typeof entry.fromAmino).toBe(
        "function",
        `${typeUrl}.fromAmino should be a function`
      );
    }
  });

  test("MsgIssueReward toAmino converts camelCase → snake_case", () => {
    const { toAmino } =
      tamizhiAminoTypes["/tamizhi.rewards.v1.MsgIssueReward"];
    const proto = {
      authority: "tamizhi1abc",
      employeeId: "emp-001",
      ruleId: "rule-001",
      memo: "test",
    };
    const amino = toAmino(proto);
    expect(amino).toEqual({
      authority: "tamizhi1abc",
      employee_id: "emp-001",
      rule_id: "rule-001",
      memo: "test",
    });
  });

  test("MsgIssueReward fromAmino converts snake_case → camelCase", () => {
    const { fromAmino } =
      tamizhiAminoTypes["/tamizhi.rewards.v1.MsgIssueReward"];
    const amino = {
      authority: "tamizhi1abc",
      employee_id: "emp-001",
      rule_id: "rule-001",
      memo: "test",
    };
    const proto = fromAmino(amino);
    expect(proto).toEqual({
      authority: "tamizhi1abc",
      employeeId: "emp-001",
      ruleId: "rule-001",
      memo: "test",
    });
  });

  test("MsgRegisterNode toAmino converts camelCase → snake_case", () => {
    const { toAmino } =
      tamizhiAminoTypes["/tamizhi.nodes.v1.MsgRegisterNode"];
    const proto = {
      owner: "tamizhi1xyz",
      nodeId: "node-001",
      endpoint: "https://node.example.com",
      stakedAmount: { denom: "utmz", amount: "1000000" },
    };
    const amino = toAmino(proto);
    expect(amino).toEqual({
      owner: "tamizhi1xyz",
      node_id: "node-001",
      endpoint: "https://node.example.com",
      staked_amount: { denom: "utmz", amount: "1000000" },
    });
  });

  test("MsgRegisterNode fromAmino converts snake_case → camelCase", () => {
    const { fromAmino } =
      tamizhiAminoTypes["/tamizhi.nodes.v1.MsgRegisterNode"];
    const amino = {
      owner: "tamizhi1xyz",
      node_id: "node-001",
      endpoint: "https://node.example.com",
      staked_amount: { denom: "utmz", amount: "1000000" },
    };
    const proto = fromAmino(amino);
    expect(proto).toEqual({
      owner: "tamizhi1xyz",
      nodeId: "node-001",
      endpoint: "https://node.example.com",
      stakedAmount: { denom: "utmz", amount: "1000000" },
    });
  });

  test("aminoType values all start with 'tamizhi/'", () => {
    for (const [typeUrl, entry] of Object.entries(tamizhiAminoTypes)) {
      expect(entry.aminoType).toMatch(
        /^tamizhi\//,
        `${typeUrl}.aminoType should start with 'tamizhi/'`
      );
    }
  });
});
