import { describe, expect, it } from "vitest";

import { borderColorWithAlpha } from "../style-utils";

describe("borderColorWithAlpha", () => {
  it("appends the alpha suffix to a primary color", () => {
    expect(borderColorWithAlpha("#112233", "30")).toBe("#11223330");
  });

  it("returns undefined instead of interpolating a falsy primaryColor into invalid CSS", () => {
    expect(borderColorWithAlpha(undefined, "30")).toBeUndefined();
    expect(borderColorWithAlpha(null, "30")).toBeUndefined();
    expect(borderColorWithAlpha("", "30")).toBeUndefined();
  });
});
