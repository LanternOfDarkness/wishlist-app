import { describe, expect, it } from "vitest";

import { borderColorWithAlpha, sketchFrameColor } from "../style-utils";

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

describe("sketchFrameColor", () => {
  it("derives the sketch stroke color from the resolved foreground token, not the border token", () => {
    expect(
      sketchFrameColor({ foreground: "#0f172a", border: "#e2e8f0" }),
    ).toBe("#0f172acc");
  });

  it("resolves to a different color per preset instead of a shared brand hex", () => {
    const light = sketchFrameColor({ foreground: "#0f172a", border: "#e2e8f0" });
    const dark = sketchFrameColor({ foreground: "#f8fafc", border: "#1e293b" });
    const rose = sketchFrameColor({ foreground: "#0f172a", border: "#ffe4e6" });

    expect(light).not.toBe(dark);
    expect(light).toBe(rose); // same foreground token -> same stroke color
    expect(dark).toBe("#f8fafccc");
  });

  it("falls back to the border token if the foreground token is somehow falsy", () => {
    expect(
      sketchFrameColor({ foreground: "" as unknown as string, border: "#e2e8f0" }),
    ).toBe("#e2e8f0");
  });
});
