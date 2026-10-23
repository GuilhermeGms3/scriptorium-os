import {
  CourseWorkSchema,
  completionIssues,
  moduleUnlocked,
  type StudyCourse,
  type CourseProgress,
  type CourseWork,
} from "../domain/study-course";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";

export const StudyCourseRepository = {
  async load(course: StudyCourse, database?: WorkspaceDatabase): Promise<CourseProgress[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const rows = await db.query(
      "SELECT * FROM study_course_progress WHERE course_id=? AND course_revision=?",
      [course.id, course.revision],
    );
    return rows.map((row) => ({
      moduleId: String(row["module_id"]),
      work: CourseWorkSchema.parse(JSON.parse(String(row["work_json"]))),
      completedAt: typeof row["completed_at"] === "string" ? row["completed_at"] : null,
      version: Number(row["version"]),
      updatedAt: String(row["updated_at"]),
    }));
  },
  async save(
    course: StudyCourse,
    moduleId: string,
    input: CourseWork,
    expectedVersion: number,
    complete: boolean,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const work = CourseWorkSchema.parse(input);
    const module = course.modules.find((item) => item.id === moduleId);
    if (!module || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new Error("Módulo ou versão de progresso inválidos.");
    if (
      work.lessons.some((id) => !module.lessons.some((item) => item.id === id)) ||
      work.readings.some((id) => !module.passages.some((item) => item.id === id)) ||
      work.criteria.some((index) => index >= module.activity.criteria.length)
    )
      throw new Error("Atividade contém referências que não pertencem ao módulo.");
    const db = database ?? (await getWorkspaceDatabase());
    const progress = await this.load(course, db);
    if (!moduleUnlocked(course, moduleId, progress))
      throw new Error("Conclua o módulo anterior para continuar.");
    const previous = progress.find((item) => item.moduleId === moduleId);
    if ((previous?.version ?? 0) !== expectedVersion)
      throw new Error(
        "O progresso mudou em outra janela. Recarregue antes de salvar; seu rascunho permanece aberto.",
      );
    if (complete || previous?.completedAt) {
      const issues = completionIssues(module, work);
      if (issues.length) throw new Error(issues.join("\n"));
    }
    const now = new Date().toISOString();
    const completedAt = previous?.completedAt ?? (complete ? now : null);
    try {
      await db.transaction([
        {
          sql: "INSERT INTO study_course_progress(course_id,course_revision,module_id,work_json,version,updated_at) SELECT ?,?,?,NULL,1,? WHERE coalesce((SELECT version FROM study_course_progress WHERE course_id=? AND course_revision=? AND module_id=?),0)<>?",
          bind: [
            course.id,
            course.revision,
            moduleId,
            now,
            course.id,
            course.revision,
            moduleId,
            expectedVersion,
          ],
        },
        {
          sql: "INSERT INTO study_course_progress(course_id,course_revision,module_id,work_json,completed_at,version,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(course_id,course_revision,module_id) DO UPDATE SET work_json=excluded.work_json,completed_at=excluded.completed_at,version=excluded.version,updated_at=excluded.updated_at",
          bind: [
            course.id,
            course.revision,
            moduleId,
            JSON.stringify(work),
            completedAt,
            expectedVersion + 1,
            now,
          ],
        },
      ]);
    } catch (cause) {
      if (/constraint/i.test(String(cause)))
        throw new Error(
          "O progresso mudou em outra janela. Recarregue antes de salvar; seu rascunho permanece aberto.",
        );
      throw cause;
    }
    notifyKnowledgeMutation();
  },
};
