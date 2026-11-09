import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve citations/bookmarks while the former standalone explorer lives in Studies.
export const Route = createFileRoute("/knowledge")({
  validateSearch: (search: Record<string, unknown>): { entity?: string; claim?: string } => ({
    ...(typeof search["entity"] === "string" ? { entity: search["entity"] } : {}),
    ...(typeof search["claim"] === "string" ? { claim: search["claim"] } : {}),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/study", search, replace: true });
  },
});
