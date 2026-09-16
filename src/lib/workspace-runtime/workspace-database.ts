import type {
  WorkspaceDatabase,
  WorkspaceRequest,
  WorkspaceRequestInput,
  WorkspaceResponse,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "./protocol";
import { StorageUnavailableError, WorkspaceMigrationError } from "../domain/errors";

class WorkerWorkspaceDatabase implements WorkspaceDatabase {
  readonly #worker: Worker;
  readonly #pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  #nextId = 1;
  persistence: "opfs" | "memory" = "memory";

  constructor() {
    this.#worker = new Worker(new URL("./workspace-sqlite.worker.ts", import.meta.url), {
      type: "module",
      name: "scriptorium-workspace",
    });
    this.#worker.onmessage = (event: MessageEvent<WorkspaceResponse>) => {
      const pending = this.#pending.get(event.data.id);
      if (!pending) return;
      this.#pending.delete(event.data.id);
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new WorkspaceMigrationError(event.data.error.message));
    };
    this.#worker.onerror = (event) => {
      for (const pending of this.#pending.values())
        pending.reject(new StorageUnavailableError(event.message));
      this.#pending.clear();
    };
  }

  async initialize(): Promise<void> {
    const result = (await this.#send({ type: "init" })) as { persistence: "opfs" | "memory" };
    this.persistence = result.persistence;
  }

  #send(request: WorkspaceRequestInput): Promise<unknown> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ ...request, id } as WorkspaceRequest);
    });
  }

  async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
    return (await this.#send({ type: "query", sql, bind })) as WorkspaceRow[];
  }
  async execute(sql: string, bind: WorkspaceSqlValue[] = []): Promise<void> {
    await this.#send({ type: "execute", sql, bind });
  }
  async transaction(statements: { sql: string; bind?: WorkspaceSqlValue[] }[]): Promise<void> {
    await this.#send({ type: "transaction", statements });
  }
  async reset(): Promise<void> {
    await this.#send({ type: "reset" });
  }
}

let databasePromise: Promise<WorkerWorkspaceDatabase> | null = null;
export function getWorkspaceDatabase(): Promise<WorkspaceDatabase> {
  if (typeof window === "undefined")
    throw new StorageUnavailableError("Workspace SQLite is available in the browser runtime only.");
  databasePromise ??= (async () => {
    const database = new WorkerWorkspaceDatabase();
    await database.initialize();
    return database;
  })();
  return databasePromise;
}

export type { WorkspaceDatabase, WorkspaceRow, WorkspaceSqlValue } from "./protocol";
