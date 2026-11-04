import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { StudyCourseRepository as repository } from "./study-course-repository";
import { ResearchWorkspaceService } from "../application/research-workspace-service";
import { GENESIS_COURSE as course } from "../content/study-courses/genesis";
import {
  emptyCourseWork,
  completionIssues,
  moduleUnlocked,
  type CourseWork,
} from "../domain/study-course";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";
const databases: DatabaseSync[] = [];
function setup(upgrade = false) {
  const native = new DatabaseSync(":memory:");
  databases.push(native);
  if (upgrade) {
    native.exec(
      "PRAGMA foreign_keys=ON; CREATE TABLE workspace_migrations(version INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,applied_at TEXT NOT NULL) STRICT",
    );
    const directory = resolve("src/lib/workspace-runtime/migrations");
    for (const file of readdirSync(directory)
      .filter((name) => /^\d{3}_.*\.sql$/.test(name) && Number(name.slice(0, 3)) <= 27)
      .sort()) {
      native.exec(readFileSync(resolve(directory, file), "utf8"));
      native
        .prepare("INSERT INTO workspace_migrations VALUES(?,?,?)")
        .run(Number(file.slice(0, 3)), file, "old");
    }
    native.exec(
      "INSERT INTO notes(id,title,content,format,created_at,updated_at) VALUES('old','Anterior','Preservar','markdown','old','old'); INSERT INTO studies(id,slug,title,description,status,research_questions_json,created_at,updated_at) VALUES('old-study','old-study','Estudo anterior',NULL,'active','[]','old','old')",
    );
  }
  applyWorkspaceMigrations(native);
  const db: WorkspaceDatabase = {
    persistence: "memory",
    async query(sql, bind = []) {
      return native.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql, bind = []) {
      native.prepare(sql).run(...bind);
    },
    async transaction(statements) {
      native.exec("BEGIN IMMEDIATE");
      try {
        for (const item of statements) native.prepare(item.sql).run(...(item.bind ?? []));
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw new Error("Not used");
    },
  };
  return { native, db };
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

function complete(index = 0): CourseWork {
  const module = course.modules[index]!;
  return {
    lessons: module.lessons.map((l) => l.id),
    readings: module.passages.map((p) => p.id),
    criteria: module.activity.criteria.map((_, i) => i),
    response:
      "Minha pergunta examina a repetição de fala e separação em Gênesis 1:1–5. A observação vem do texto; a interpretação exige comparar o argumento de uma fonte identificada.",
  };
}
describe("percurso acadêmico persistente", () => {
  it("upgrades 27 additively, preserves notes and studies, and remains idempotent", async () => {
    const { native, db } = setup(true);
    applyWorkspaceMigrations(native);
    expect(native.prepare("SELECT content FROM notes WHERE id='old'").get()).toMatchObject({
      content: "Preservar",
    });
    expect(native.prepare("SELECT title FROM studies WHERE id='old-study'").get()).toMatchObject({
      title: "Estudo anterior",
    });
    expect(native.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(await repository.load(course, db)).toEqual([]);
  });
  it("locks future modules and requires lessons, real Bible readings, response and reflection criteria", async () => {
    const { db } = setup();
    await expect(
      repository.save(course, course.modules[1]!.id, complete(1), 0, true, db),
    ).rejects.toThrow("anterior");
    const work = complete();
    work.readings = [];
    await expect(repository.save(course, course.modules[0]!.id, work, 0, true, db)).rejects.toThrow(
      "leitura de",
    );
    await repository.save(course, course.modules[0]!.id, emptyCourseWork(), 0, false, db);
    expect(moduleUnlocked(course, course.modules[1]!.id, await repository.load(course, db))).toBe(
      false,
    );
    await repository.save(course, course.modules[0]!.id, complete(), 1, true, db);
    const saved = await repository.load(course, db);
    expect(saved[0]).toMatchObject({ version: 2, work: complete() });
    expect(saved[0]!.completedAt).toBeTruthy();
    expect(moduleUnlocked(course, course.modules[1]!.id, saved)).toBe(true);
    await expect(
      repository.save(course, course.modules[0]!.id, emptyCourseWork(), 2, false, db),
    ).rejects.toThrow();
    expect(await repository.load({ ...course, revision: 2 }, db)).toEqual([]);
  });
  it("rejects stale versions and a race between preflight and transaction without overwriting", async () => {
    const { db } = setup();
    const id = course.modules[0]!.id;
    await repository.save(course, id, complete(), 0, false, db);
    await expect(repository.save(course, id, emptyCourseWork(), 0, false, db)).rejects.toThrow(
      "outra janela",
    );
    const racing: WorkspaceDatabase = {
      ...db,
      async transaction(statements) {
        await db.execute("UPDATE study_course_progress SET version=version+1 WHERE course_id=?", [
          course.id,
        ]);
        await db.transaction(statements);
      },
    };
    await expect(repository.save(course, id, emptyCourseWork(), 1, false, racing)).rejects.toThrow(
      "outra janela",
    );
    expect((await repository.load(course, db))[0]).toMatchObject({ version: 2, work: complete() });
  });
  it("rejects forged lesson/criterion ids", async () => {
    const { db } = setup();
    await expect(
      repository.save(
        course,
        course.modules[0]!.id,
        { ...complete(), lessons: ["inventada"] },
        0,
        true,
        db,
      ),
    ).rejects.toThrow("referências");
    await expect(
      repository.save(
        course,
        course.modules[0]!.id,
        { ...complete(), criteria: [999] },
        0,
        true,
        db,
      ),
    ).rejects.toThrow("referências");
  });
  it("roundtrips course work in backup and accepts older backups without it", async () => {
    const { db } = setup();
    await repository.save(course, course.modules[0]!.id, complete(), 0, true, db);
    const raw = await ResearchWorkspaceService.exportJson(db);
    const target = setup();
    await ResearchWorkspaceService.importJson(raw, target.db);
    expect(await repository.load(course, target.db)).toEqual(await repository.load(course, db));
    const old = JSON.parse(raw);
    delete old.research.courseProgress;
    delete old.manifest.checksum;
    const checksum = createHash("sha256").update(JSON.stringify(old)).digest("hex");
    old.manifest.checksum = checksum;
    const legacy = setup();
    await ResearchWorkspaceService.importJson(JSON.stringify(old), legacy.db);
    expect(await repository.load(course, legacy.db)).toEqual([]);
  });
  it("rejects invalid backup progress before any writes", async () => {
    const { db } = setup();
    const invalid = JSON.parse(await ResearchWorkspaceService.exportJson(db));
    invalid.research.courseProgress = [
      {
        course_id: course.id,
        course_revision: 1,
        module_id: "orientacao",
        version: 1,
        updated_at: new Date().toISOString(),
        completed_at: null,
        work_json: '{"response":123}',
      },
    ];
    await expect(ResearchWorkspaceService.importJson(JSON.stringify(invalid), db)).rejects.toThrow(
      "Progresso",
    );
    expect(await repository.load(course, db)).toEqual([]);
  });
  it("contains twelve developed lessons with introduction, explanation, discussion and conclusion", () => {
    expect(course.modules).toHaveLength(6);
    expect(course.modules.flatMap((m) => m.lessons)).toHaveLength(12);
    for (const module of course.modules) {
      expect(completionIssues(module, complete(course.modules.indexOf(module)))).toEqual([]);
      expect(module.passages.length).toBeGreaterThan(0);
      for (const lesson of module.lessons) {
        expect(lesson.sections.map((s) => s.kind)).toEqual([
          "introduction",
          "concept",
          "example",
          "discussion",
          "conclusion",
        ]);
        expect(lesson.sections.flatMap((s) => s.paragraphs).join(" ").length).toBeGreaterThan(2000);
        for (const section of lesson.sections)
          for (const ref of section.references)
            expect(course.references.some((r) => r.id === ref)).toBe(true);
      }
    }
  });
});
