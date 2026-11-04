import { expect, it } from "vitest";
import { classifyContextJob, ContextQueueSchema } from "./contextual-library-queue";

const confessions = "26e7477dd8e304a91005ec45b4033e0938dcb23b3f554b4f5a47345f7fc6e6c9";
it("queues a calibrated edition, not an arbitrary matching filename", () => {
  expect(classifyContextJob(confessions, "Confissões", 197, 0).status).toBe("pending");
  expect(classifyContextJob("a".repeat(64), "Confissões", 197, 0).status).toBe("blocked");
});
it("does not confuse existing associations with integral review", () => {
  const job = classifyContextJob(confessions, "Confissões", 197, 20);
  expect(job.status).toBe("existing-context");
  expect(job.message).toContain("não comprova");
});
it("keeps OCR, Psalter crosswalk and missing apparatus as different impediments", () => {
  expect(classifyContextJob(confessions, "Confissões", 0, 0).message).toContain("OCR");
  expect(classifyContextJob("a".repeat(64), "Salmos comentados", 100, 0).message).toContain(
    "crosswalk",
  );
  expect(classifyContextJob("b".repeat(64), "Bíblia de Jerusalém", 1219, 0).message).toContain(
    "aparato",
  );
  expect(classifyContextJob("c".repeat(64), "Léxico Hebraico", 600, 0).message).toContain(
    "verbete",
  );
});
it("rejects invalid checkpoint statuses and unsafe edition ids", () => {
  expect(
    ContextQueueSchema.safeParse({
      version: 1,
      workspace: "file",
      updatedAt: "now",
      jobs: [{ checksum: "../x", status: "complete" }],
    }).success,
  ).toBe(false);
});
