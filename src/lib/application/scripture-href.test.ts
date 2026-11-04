import { describe, expect, it } from "vitest";
import { scriptureHref } from "./scripture-href";

describe("addresses of passages in the reader", () => {
  it("opens the chapter at the verse, in the edition of the result", () => {
    expect(scriptureHref("john", 3, { verse: 16 })).toBe("/scripture/john/3?v=16");
    expect(scriptureHref("john", 1, { verse: 1, edition: "sblgnt" })).toBe(
      "/scripture/john/1?v=1&edition=sblgnt",
    );
  });

  it("is just the chapter when no verse is known", () => {
    expect(scriptureHref("genesis", 1)).toBe("/scripture/genesis/1");
    expect(scriptureHref("1-john", 4, { verse: undefined })).toBe("/scripture/1-john/4");
  });
});
