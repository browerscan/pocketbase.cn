import { describe, expect, it } from "vitest";
import { sanitizeRichHtml } from "./sanitize";

describe("sanitizeRichHtml", () => {
  it("removes script tags", () => {
    const out = sanitizeRichHtml('<p>Hello</p><script>alert("x")</script>');
    expect(out).toContain("<p>Hello</p>");
    expect(out).not.toContain("<script");
  });

  it("adds rel/target for links", () => {
    const out = sanitizeRichHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });
});
