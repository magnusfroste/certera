import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "@/lib/oauth-return-path";

describe("oauthReturnPath", () => {
  it("keeps a same-origin relative path", () => {
    expect(oauthReturnPath("/app")).toBe("/app");
    expect(oauthReturnPath("/signed?tab=share#x")).toBe("/signed?tab=share#x");
  });

  it("rejects protocol-relative, absolute and non-string values", () => {
    expect(oauthReturnPath("//evil.com/x")).toBe("/");
    expect(oauthReturnPath("https://evil.com/x")).toBe("/");
    expect(oauthReturnPath(null)).toBe("/");
    expect(oauthReturnPath(42)).toBe("/");
  });

  it("rejects backslashes and control characters", () => {
    expect(oauthReturnPath("/a\\b")).toBe("/");
    expect(oauthReturnPath("/a\u0000b")).toBe("/");
    expect(oauthReturnPath("/a\u001fb")).toBe("/");
    expect(oauthReturnPath("/a\u007fb")).toBe("/");
  });
});
