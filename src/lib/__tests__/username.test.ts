import { describe, expect, it } from "vitest";

import {
  isReservedUsername,
  isValidUsername,
  isValidUsernameFormat,
} from "../username";

describe("isValidUsernameFormat", () => {
  it("accepts letters, numbers, and dashes within 3-30 chars", () => {
    expect(isValidUsernameFormat("john-doe-123")).toBe(true);
    expect(isValidUsernameFormat("abc")).toBe(true);
    expect(isValidUsernameFormat("a".repeat(30))).toBe(true);
  });

  it("rejects too-short or too-long usernames", () => {
    expect(isValidUsernameFormat("ab")).toBe(false);
    expect(isValidUsernameFormat("a".repeat(31))).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(isValidUsernameFormat("john_doe")).toBe(false);
    expect(isValidUsernameFormat("john doe")).toBe(false);
    expect(isValidUsernameFormat("john@doe")).toBe(false);
    expect(isValidUsernameFormat("")).toBe(false);
  });
});

describe("isReservedUsername", () => {
  it("rejects route-colliding and locale-colliding names, case-insensitively", () => {
    for (const name of ["dashboard", "Dashboard", "login", "embed", "api", "en", "uk", "EN"]) {
      expect(isReservedUsername(name)).toBe(true);
    }
  });

  it("allows ordinary names", () => {
    expect(isReservedUsername("john-doe")).toBe(false);
  });
});

describe("isValidUsername", () => {
  it("combines format and reserved-word checks", () => {
    expect(isValidUsername("john-doe")).toBe(true);
    expect(isValidUsername("dashboard")).toBe(false);
    expect(isValidUsername("jo")).toBe(false);
  });
});
