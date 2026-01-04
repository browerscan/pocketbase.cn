import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
