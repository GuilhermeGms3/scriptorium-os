import {
  markTargetJson,
  verseMarkKey,
  verseMarksFromRows,
  type MarkColor,
  type VerseAddress,
  type VerseMark,
} from "../domain/verse-marks";
import { passageLabel } from "../i18n";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";

function uid(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

/**
 * Verse highlights and favorites, kept in the `highlights` and `bookmarks` tables that already
 * travel in the backup. One color and one star per verse: setting either replaces the old one.
 */
export const VerseMarkRepository = {
  async list(database?: WorkspaceDatabase): Promise<VerseMark[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const [highlights, bookmarks] = await Promise.all([
      db.query(
        "SELECT target_kind,target_json,style_token,created_at FROM highlights WHERE target_kind='passage'",
      ),
      db.query(
        "SELECT target_kind,target_json,created_at FROM bookmarks WHERE target_kind='passage'",
      ),
    ]);
    return verseMarksFromRows(highlights, bookmarks);
  },

  /** Paints the verse with `color`, or takes its color away with null. */
  async setColor(
    address: VerseAddress,
    color: MarkColor | null,
    editionId?: string,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    const key = verseMarkKey(address);
    await db.transaction([
      { sql: "DELETE FROM highlights WHERE target_kind='passage' AND target_id=?", bind: [key] },
      ...(color
        ? [
            {
              sql: "INSERT INTO highlights(id,target_kind,target_id,target_json,style_token,created_at) VALUES(?,'passage',?,?,?,?)",
              bind: [
                uid("highlight"),
                key,
                markTargetJson(address, editionId),
                color,
                new Date().toISOString(),
              ],
            },
          ]
        : []),
    ]);
  },

  async setFavorite(
    address: VerseAddress,
    favorite: boolean,
    editionId?: string,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    const key = verseMarkKey(address);
    await db.transaction([
      { sql: "DELETE FROM bookmarks WHERE target_kind='passage' AND target_id=?", bind: [key] },
      ...(favorite
        ? [
            {
              sql: "INSERT INTO bookmarks(id,target_kind,target_id,target_json,label,created_at) VALUES(?,'passage',?,?,?,?)",
              bind: [
                uid("bookmark"),
                key,
                markTargetJson(address, editionId),
                passageLabel({
                  bookId: address.bookId,
                  chapter: address.chapter,
                  verseStart: address.verse,
                  verseEnd: address.verse,
                }),
                new Date().toISOString(),
              ],
            },
          ]
        : []),
    ]);
  },
};
