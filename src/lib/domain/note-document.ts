export interface NoteFolder {
  id: string;
  studyId: string;
  parentId: string | null;
  name: string;
}
export interface NotePlacement {
  noteId: string;
  studyId: string;
  folderId: string;
}
export interface NoteReference {
  sourceId: string;
  targetId: string;
}
export interface NoteTarget {
  id: string;
  title: string;
}
export interface WikiReference {
  raw: string;
  label: string;
  targetId: string | undefined;
  index: number;
}

/** Stable IDs survive a rename. Plain [[titles]] resolve only when unambiguous. */
export function wikiReferences(body: string, targets: readonly NoteTarget[]): WikiReference[] {
  const byId = new Map(targets.map((note) => [note.id, note]));
  const byTitle = new Map<string, NoteTarget[]>();
  for (const note of targets) {
    const key = note.title.trim().toLocaleLowerCase("pt-BR");
    byTitle.set(key, [...(byTitle.get(key) ?? []), note]);
  }
  // Links inside fenced or inline code are examples, not relationships.
  const pattern = /```[\s\S]*?```|`[^`\n]*`|\[\[([^\]\n]{1,1000})\]\]/g;
  const result: WikiReference[] = [];
  for (const match of body.matchAll(pattern)) {
    if (!match[1]) continue;
    const [rawTarget = "", ...alias] = match[1].split("|");
    const key = rawTarget.trim();
    const titleMatches = byTitle.get(key.toLocaleLowerCase("pt-BR"));
    const note = byId.get(key) ?? (titleMatches?.length === 1 ? titleMatches[0] : undefined);
    result.push({
      raw: match[0],
      label: alias.join("|").trim() || note?.title || key,
      targetId: note?.id,
      index: match.index,
    });
  }
  return result;
}

export function wikiLink(note: NoteTarget): string {
  // Display labels cannot escape the link. IDs are internal, not user filenames/paths.
  return `[[${note.id}|${note.title.replace(/[[\]|\r\n]/g, " ").trim()}]]`;
}

export function folderPath(id: string | null, folders: readonly NoteFolder[]): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  let current = id;
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = byId.get(current);
    if (!folder) break;
    parts.unshift(folder.name);
    current = folder.parentId;
  }
  return parts.join(" / ");
}
