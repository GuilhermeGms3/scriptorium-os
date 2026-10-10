import { describe, expect, it } from "vitest";
import { explicitPublicationForProfile } from "./local-knowledge-pipeline-service";

describe("profile-aware explicit passage publication", () => {
  it("shows a validated explicit reference from a commentary or study Bible", () => {
    expect(explicitPublicationForProfile("commentary", true, true)).toBe("machine-visible");
    expect(explicitPublicationForProfile("study-bible", true, true)).toBe("machine-visible");
  });

  it("keeps dense reference works in review even when the address resolves", () => {
    expect(explicitPublicationForProfile("lexicon", true, true)).toBe("exception");
    expect(explicitPublicationForProfile("dictionary", true, true)).toBe("exception");
    expect(explicitPublicationForProfile("encyclopedia", true, true)).toBe("exception");
    expect(explicitPublicationForProfile("interlinear", true, true)).toBe("exception");
  });

  it("does not publish without address validation or numbering confirmation", () => {
    expect(explicitPublicationForProfile("commentary", false, true)).toBe("exception");
    expect(explicitPublicationForProfile("commentary", true, false)).toBe("exception");
  });
});
