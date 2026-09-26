import { describe, expect, it } from "vitest";
import { NAG_HAMMADI_CATALOG, NAG_HAMMADI_CODICES } from "./nag-hammadi-catalog";

describe("Nag Hammadi catalog", () => {
  it("represents all thirteen codices and fifty-two tractate witnesses", () => {
    expect(NAG_HAMMADI_CODICES).toHaveLength(13);
    expect(NAG_HAMMADI_CATALOG).toHaveLength(52);
    expect(new Set(NAG_HAMMADI_CATALOG.map((item) => item.id)).size).toBe(52);
  });

  it("distinguishes repeated witnesses and installed source text", () => {
    expect(NAG_HAMMADI_CATALOG.filter((item) => item.workKey === "apocryphon-john")).toHaveLength(
      3,
    );
    const thomas = NAG_HAMMADI_CATALOG.find((item) => item.id === "nhc-02-02");
    expect(thomas?.availability).toBe("installed-source-text");
    expect(thomas?.installedWorkId).toBe("work:gospel-thomas-coptic");
    expect(NAG_HAMMADI_CATALOG.find((item) => item.id === "nhc-02-03")?.availability).toBe(
      "catalog-only",
    );
  });
});
