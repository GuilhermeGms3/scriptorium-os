import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { withFeedback } from "../components/common/feedback";
import {
  applyVerseMarkChange,
  verseMarkKey,
  type MarkColor,
  type VerseAddress,
  type VerseMark,
} from "../lib/domain/verse-marks";
import { VerseMarkRepository } from "../lib/repositories/verse-mark-repository";
import { workspaceQueryKey } from "../lib/workspace-runtime/workspace-queries";
import { useWorkspaceQuery } from "./use-workspace-query";

const MARKS_KEY = ["verse-marks"] as const;

/** Every marked verse, read once and shared by the reader, the study panel and "Marcações". */
export function useVerseMarks() {
  const query = useWorkspaceQuery(MARKS_KEY, () => VerseMarkRepository.list());
  const marks = useMemo(() => query.data ?? [], [query.data]);
  const byKey = useMemo(() => new Map(marks.map((mark) => [verseMarkKey(mark), mark])), [marks]);
  const markOf = useCallback(
    (address: VerseAddress): VerseMark | undefined => byKey.get(verseMarkKey(address)),
    [byKey],
  );
  return { marks, markOf, loading: query.isPending, error: query.error };
}

/**
 * Marking answers at once (the verse changes color before the database replies) and is saved
 * right after; if saving fails the reader is told and the marks are read again.
 */
export function useVerseMarkActions() {
  const client = useQueryClient();
  const change = useCallback(
    async (
      address: VerseAddress,
      update: { color?: MarkColor | null; favorite?: boolean },
      save: () => Promise<void>,
      failure: string,
    ) => {
      const key = workspaceQueryKey(MARKS_KEY);
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<{ value: VerseMark[] }>(key, (box) =>
        box
          ? { value: applyVerseMarkChange(box.value, address, update, new Date().toISOString()) }
          : box,
      );
      await withFeedback(save(), { failure });
      await client.invalidateQueries({ queryKey: key });
    },
    [client],
  );
  return useMemo(
    () => ({
      setColor: (address: VerseAddress, color: MarkColor | null, editionId?: string) =>
        change(
          address,
          { color },
          () => VerseMarkRepository.setColor(address, color, editionId),
          "Não foi possível marcar o versículo.",
        ),
      setFavorite: (address: VerseAddress, favorite: boolean, editionId?: string) =>
        change(
          address,
          { favorite },
          () => VerseMarkRepository.setFavorite(address, favorite, editionId),
          favorite
            ? "Não foi possível guardar o favorito."
            : "Não foi possível tirar dos favoritos.",
        ),
    }),
    [change],
  );
}
