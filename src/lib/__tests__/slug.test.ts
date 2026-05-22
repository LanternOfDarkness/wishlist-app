import { describe, expect, it } from "vitest";
import { slugify, slugifyWithTimestamp, generateUsername } from "../slug";

describe("slugify", () => {
  it("lowercases and trims", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! @World #2024")).toBe("hello-world-2024");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("-hello-")).toBe("hello");
  });
});

describe("slugifyWithTimestamp", () => {
  it("appends timestamp suffix", () => {
    const result = slugifyWithTimestamp("My Wishlist");
    expect(result).toMatch(/^my-wishlist-\d{4}$/);
  });

  it("handles empty input", () => {
    const result = slugifyWithTimestamp("");
    expect(result).toMatch(/^item-\d{4}$/);
  });
});

describe("generateUsername", () => {
  it("uses name when available", () => {
    const result = generateUsername("John Doe", "john@test.com");
    expect(result).toMatch(/^johndoe-\d{4}$/);
  });

  it("falls back to email prefix when no name", () => {
    const result = generateUsername(null, "alice@test.com");
    expect(result).toMatch(/^alice-\d{4}$/);
  });

  it("handles null name and undefined email", () => {
    const result = generateUsername(null, undefined);
    expect(result).toMatch(/^user-\d{4}$/);
  });
});
