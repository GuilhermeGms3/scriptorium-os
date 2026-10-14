import { z } from "zod";
import type { WorkspaceDatabase, WorkspaceRow, WorkspaceSqlValue } from "./protocol";

let session: Promise<boolean> | undefined;
export function installationAvailable(): Promise<boolean> {
  session ??= (async () => {
    const response = await fetch("/api/workspace/session", {
      method: "POST",
      headers: { "x-scriptorium-workspace": "1" },
    });
    if (response.status === 404) return false;
    if (!response.ok)
      throw new Error(
        "Não foi possível abrir a instalação. O workspace do navegador não será usado silenciosamente.",
      );
    return true;
  })();
  return session;
}
export async function installationFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await installationAvailable();
  const headers = new Headers(init.headers);
  headers.set("x-scriptorium-workspace", "1");
  let result = await fetch(`/api/workspace/${path}`, { ...init, headers });
  if (result.status === 401) {
    session = undefined;
    await installationAvailable();
    result = await fetch(`/api/workspace/${path}`, { ...init, headers });
  }
  if (!result.ok) {
    const message = await result.text();
    throw new Error(`Armazenamento da instalação (${result.status}): ${message.slice(0, 300)}`);
  }
  return result;
}
const rows = z.array(z.record(z.union([z.string(), z.number(), z.null()])));
export class InstallationWorkspaceDatabase implements WorkspaceDatabase {
  readonly persistence = "installation" as const;
  async request(input: unknown) {
    return (
      await installationFetch("command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
    ).json() as Promise<unknown>;
  }
  async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
    return rows.parse(await this.request({ type: "query", sql, bind }));
  }
  async execute(sql: string, bind: WorkspaceSqlValue[] = []): Promise<void> {
    await this.request({ type: "execute", sql, bind });
  }
  async transaction(statements: { sql: string; bind?: WorkspaceSqlValue[] }[]): Promise<void> {
    await this.request({ type: "transaction", statements });
  }
  async reset(): Promise<void> {
    throw new Error(
      "A instalação compartilhada exige backup antes de exclusão. O banco não foi apagado.",
    );
  }
}
