import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NotesWorkspace } from "../components/notes/notes-workspace";

export const Route = createFileRoute("/notes")({
  validateSearch: z.object({
    group: z.string().max(500).optional().catch(undefined),
    note: z.string().max(500).optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: "Notas — Scriptorium" }] }),
  component: NotesPage,
});
function NotesPage() {
  const search = Route.useSearch();
  return <NotesWorkspace initialGroupId={search.group} initialNoteId={search.note} />;
}
