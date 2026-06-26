import { describe, expect, it } from "vitest";

import {
  buildProvisionUserUrl,
  parseProvisionContext,
  sanitizeReturnTo,
} from "./provision-user-context";

describe("sanitizeReturnTo", () => {
  it("accepts same-origin relative paths", () => {
    expect(sanitizeReturnTo("/employees/party-1", "/fallback")).toBe("/employees/party-1");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(sanitizeReturnTo("//evil.example/phish", "/fallback")).toBe("/fallback");
    expect(sanitizeReturnTo("https://evil.example/phish", "/fallback")).toBe("/fallback");
  });

  it("falls back when missing or empty", () => {
    expect(sanitizeReturnTo(null, "/fallback")).toBe("/fallback");
    expect(sanitizeReturnTo("", "/fallback")).toBe("/fallback");
  });
});

describe("buildProvisionUserUrl", () => {
  it("builds user create URL with linkPartyId and returnTo", () => {
    const url = buildProvisionUserUrl({
      partyId: "party-42",
      returnTo: "/employees/party-42",
    });

    expect(url).toBe(
      "/users/new?linkPartyId=party-42&returnTo=%2Femployees%2Fparty-42",
    );
  });
});

describe("parseProvisionContext", () => {
  it("parses provision params and sanitizes returnTo", () => {
    const params = new URLSearchParams(
      "linkPartyId=party-42&returnTo=%2Femployees%2Fparty-42",
    );

    expect(parseProvisionContext(params, "/employees/party-42")).toEqual({
      linkPartyId: "party-42",
      returnTo: "/employees/party-42",
      safeReturnTo: "/employees/party-42",
    });
  });

  it("uses fallback when returnTo is invalid", () => {
    const params = new URLSearchParams(
      "linkPartyId=party-42&returnTo=https%3A%2F%2Fevil.example",
    );

    expect(parseProvisionContext(params, "/employees/party-42")).toEqual({
      linkPartyId: "party-42",
      returnTo: "https://evil.example",
      safeReturnTo: "/employees/party-42",
    });
  });
});
