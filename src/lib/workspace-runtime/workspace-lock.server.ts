import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { hostname as osHostname } from "node:os";
import { join } from "node:path";

export const WORKSPACE_LOCK_FILE = "workspace.lock";
export const LOCK_HEARTBEAT_MS = 30_000;
/** A lock without a heartbeat for this long belongs to a process that died or was killed. */
export const LOCK_STALE_AFTER_MS = 120_000;

export interface WorkspaceLockRecord {
  pid: number;
  hostname: string;
  platform: string;
  startedAt: string;
  heartbeatAt: string;
  /** Random token: Windows and the Docker container cannot see each other's pids. */
  owner: string;
}

export interface WorkspaceLockOptions {
  /** Milliseconds since the epoch; injectable so tests do not wait for real time. */
  now?: () => number;
  /** Runs `beat` every `intervalMs`; returns a function that stops it. */
  schedule?: (beat: () => void, intervalMs: number) => () => void;
  log?: (message: string) => void;
  identity?: Partial<Pick<WorkspaceLockRecord, "pid" | "hostname" | "platform">>;
  /** Releases the lock on exit, SIGINT and SIGTERM. On by default. */
  releaseOnExit?: boolean;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "horário desconhecido"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export class WorkspaceLockedError extends Error {
  readonly code = "workspace-locked";
  constructor(readonly holder: Pick<WorkspaceLockRecord, "hostname" | "startedAt">) {
    super(
      `Este acervo já está aberto por outro processo (${holder.hostname}, desde ${formatTime(holder.startedAt)}). Feche-o antes de abrir aqui.`,
    );
    this.name = "WorkspaceLockedError";
  }
}

function errorCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/** The lock as written, null when it is half-written or unreadable, undefined when it is gone. */
function readRecord(path: string): WorkspaceLockRecord | null | undefined {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
  try {
    const value = JSON.parse(raw) as Partial<WorkspaceLockRecord>;
    return typeof value.owner === "string" &&
      typeof value.hostname === "string" &&
      typeof value.startedAt === "string" &&
      typeof value.heartbeatAt === "string"
      ? (value as WorkspaceLockRecord)
      : null;
  } catch {
    return null;
  }
}

function intervalSchedule(beat: () => void, intervalMs: number): () => void {
  const timer = setInterval(beat, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

/**
 * Exclusive lock on an installation folder, so the Vite server on Windows and the Docker container
 * never write the same SQLite database at the same time. Liveness is the heartbeat in the file, not
 * the pid, which neither side can check for the other.
 */
export class WorkspaceLock {
  readonly path: string;
  #record: WorkspaceLockRecord;
  readonly #now: () => number;
  readonly #log: (message: string) => void;
  #stopHeartbeat: () => void = () => undefined;
  #removeExitHooks: () => void = () => undefined;
  #released = false;
  /** Another process recovered the lock while this one was not beating (sleep, long pause). */
  lost = false;

  private constructor(path: string, record: WorkspaceLockRecord, options: WorkspaceLockOptions) {
    this.path = path;
    this.#record = record;
    this.#now = options.now ?? Date.now;
    this.#log = options.log ?? ((message) => console.warn(message));
    this.#stopHeartbeat = (options.schedule ?? intervalSchedule)(
      () => this.#beat(),
      LOCK_HEARTBEAT_MS,
    );
    if (options.releaseOnExit ?? true) this.#installExitHooks();
  }

  static acquire(root: string, options: WorkspaceLockOptions = {}): WorkspaceLock {
    const now = options.now ?? Date.now;
    const log = options.log ?? ((message: string) => console.warn(message));
    const path = join(root, WORKSPACE_LOCK_FILE);
    const stamp = new Date(now()).toISOString();
    const record: WorkspaceLockRecord = {
      pid: options.identity?.pid ?? process.pid,
      hostname: options.identity?.hostname ?? osHostname(),
      platform: options.identity?.platform ?? process.platform,
      startedAt: stamp,
      heartbeatAt: stamp,
      owner: randomBytes(16).toString("hex"),
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const descriptor = openSync(path, "wx");
        try {
          writeSync(descriptor, JSON.stringify(record, null, 2));
        } finally {
          closeSync(descriptor);
        }
        return new WorkspaceLock(path, record, options);
      } catch (error) {
        if (errorCode(error) !== "EEXIST") throw error;
      }
      const holder = readRecord(path);
      if (holder === undefined) continue;
      // A half-written lock has no heartbeat yet; the file's own time stands in for it.
      const heartbeat = holder ? Date.parse(holder.heartbeatAt) : statSync(path).mtimeMs;
      if (now() - heartbeat < LOCK_STALE_AFTER_MS)
        throw new WorkspaceLockedError(
          holder ?? {
            hostname: "processo desconhecido",
            startedAt: new Date(heartbeat).toISOString(),
          },
        );
      // Moving the abandoned lock aside is atomic, so only one process can recover it.
      const aside = `${path}.abandoned-${record.owner}`;
      try {
        renameSync(path, aside);
      } catch (error) {
        if (errorCode(error) === "ENOENT") continue;
        throw error;
      }
      const moved = readRecord(aside);
      if ((moved?.owner ?? null) !== (holder?.owner ?? null)) {
        // Another process recovered it first and wrote a fresh lock: give it back.
        if (!existsSync(path)) renameSync(aside, path);
        if (moved) throw new WorkspaceLockedError(moved);
        continue;
      }
      unlinkSync(aside);
      log(
        `Lock abandonado do acervo recuperado em ${root}: ${holder?.hostname ?? "processo desconhecido"} (pid ${holder?.pid ?? "?"}, ${holder?.platform ?? "?"}), último sinal em ${holder?.heartbeatAt ?? new Date(heartbeat).toISOString()}.`,
      );
    }
    throw new Error("Não foi possível obter o lock do acervo.");
  }

  get record(): Readonly<WorkspaceLockRecord> {
    return this.#record;
  }

  #owns(): boolean {
    return readRecord(this.path)?.owner === this.#record.owner;
  }

  #beat(): void {
    if (this.#released || this.lost) return;
    try {
      if (!this.#owns()) {
        this.lost = true;
        this.#stopHeartbeat();
        this.#log(
          `O lock do acervo em ${this.path} foi recuperado por outro processo; este processo deixou de escrever nele.`,
        );
        return;
      }
      this.#record = { ...this.#record, heartbeatAt: new Date(this.#now()).toISOString() };
      // Written in place: a reader that catches it half-written falls back to the file time.
      writeFileSync(this.path, JSON.stringify(this.#record, null, 2));
    } catch (error) {
      this.#log(
        `Falha ao renovar o lock do acervo: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  #installExitHooks(): void {
    const onExit = () => this.release();
    const onSignal = (signal: NodeJS.Signals) => {
      this.release();
      // Without other listeners, the default action (terminate) must still happen.
      if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
    };
    process.once("exit", onExit);
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    this.#removeExitHooks = () => {
      process.off("exit", onExit);
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };
  }

  /** Stops the heartbeat and deletes the lock, unless another process has since taken it. */
  release(): void {
    if (this.#released) return;
    this.#released = true;
    this.#stopHeartbeat();
    this.#removeExitHooks();
    try {
      if (this.#owns()) unlinkSync(this.path);
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
    }
  }
}
