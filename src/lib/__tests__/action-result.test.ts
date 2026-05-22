import { describe, expect, it } from "vitest";
import { success, failure, type ActionResult } from "../action-result";

describe("success", () => {
  it("creates a success result without data", () => {
    const result: ActionResult = success();
    expect(result).toEqual({ success: true });
  });

  it("creates a success result with data", () => {
    const result = success({ id: "1" });
    expect(result).toEqual({ success: true, data: { id: "1" } });
  });
});

describe("failure", () => {
  it("creates a failure result", () => {
    const result: ActionResult = failure("Something went wrong");
    expect(result).toEqual({ success: false, error: "Something went wrong" });
  });
});
