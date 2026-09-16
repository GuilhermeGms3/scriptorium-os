export type WorkspaceSqlValue = string | number | null | Uint8Array;
export type WorkspaceRow = Record<string, WorkspaceSqlValue>;

export type WorkspaceRequest =
  | { id: number; type: "init" }
  | { id: number; type: "query"; sql: string; bind?: WorkspaceSqlValue[] }
  | { id: number; type: "execute"; sql: string; bind?: WorkspaceSqlValue[] }
  | { id: number; type: "transaction"; statements: { sql: string; bind?: WorkspaceSqlValue[] }[] }
  | { id: number; type: "reset" };
export type WorkspaceRequestInput = WorkspaceRequest extends infer Request
  ? Request extends { id: number }
    ? Omit<Request, "id">
    : never
  : never;

export type WorkspaceResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: { name: string; message: string } };

export interface WorkspaceDatabase {
  readonly persistence: "opfs" | "memory";
  query(sql: string, bind?: WorkspaceSqlValue[]): Promise<WorkspaceRow[]>;
  execute(sql: string, bind?: WorkspaceSqlValue[]): Promise<void>;
  transaction(statements: { sql: string; bind?: WorkspaceSqlValue[] }[]): Promise<void>;
  reset(): Promise<void>;
}
