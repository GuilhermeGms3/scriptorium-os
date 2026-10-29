import { describe, expect, it } from "vitest";
import {
  applyVerseMarkChange,
  markTargetJson,
  sortVerseMarks,
  verseMarksFromRows,
  type VerseMark,
} from "./verse-marks";

const at = (day: number) => `2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`;
const verse = (bookId: string, chapter: number, number: number) => ({
  bookId,
  chapter,
  verse: number,
});

describe("marcações lidas do banco", () => {
  it("joins the color and the star of the same verse into one mark", () => {
    const john = verse("john", 3, 16);
    const marks = verseMarksFromRows(
      [
        {
          target_kind: "passage",
          target_json: markTargetJson(john, "blivre"),
          style_token: "yellow",
          created_at: at(1),
        },
      ],
      [{ target_kind: "passage", target_json: markTargetJson(john), created_at: at(5) }],
    );
    expect(marks).toEqual([
      { ...john, color: "yellow", favorite: true, editionId: "blivre", markedAt: at(5) },
    ]);
  });

  it("skips a row it cannot read instead of losing every other mark", () => {
    const marks = verseMarksFromRows(
      [
        {
          target_kind: "passage",
          target_json: "{quebrado",
          style_token: "yellow",
          created_at: at(1),
        },
        {
          target_kind: "passage",
          target_json: markTargetJson(verse("john", 1, 1)),
          style_token: "vermelho-neon",
          created_at: at(1),
        },
        { target_kind: "source", target_json: null, style_token: "yellow", created_at: at(1) },
        {
          target_kind: "passage",
          target_json: markTargetJson(verse("john", 1, 2)),
          style_token: "green",
          created_at: at(2),
        },
      ],
      [{ target_kind: "passage", target_json: JSON.stringify({ ref: {} }), created_at: at(1) }],
    );
    expect(marks).toEqual([
      { ...verse("john", 1, 2), color: "green", favorite: false, markedAt: at(2) },
    ]);
  });
});

describe("marcar e desmarcar na tela", () => {
  const marked: VerseMark[] = [
    { ...verse("john", 3, 16), color: "yellow", favorite: true, markedAt: at(1) },
  ];

  it("changes the color and keeps the star", () => {
    expect(applyVerseMarkChange(marked, verse("john", 3, 16), { color: "blue" }, at(2))).toEqual([
      { ...verse("john", 3, 16), color: "blue", favorite: true, markedAt: at(2) },
    ]);
  });

  it("forgets a verse left with no color and no star", () => {
    const uncolored = applyVerseMarkChange(marked, verse("john", 3, 16), { color: null }, at(2));
    expect(uncolored).toEqual([{ ...verse("john", 3, 16), favorite: true, markedAt: at(2) }]);
    expect(
      applyVerseMarkChange(uncolored, verse("john", 3, 16), { favorite: false }, at(3)),
    ).toEqual([]);
  });

  it("marks a verse that had nothing", () => {
    expect(applyVerseMarkChange([], verse("psalms", 23, 1), { favorite: true }, at(4))).toEqual([
      { ...verse("psalms", 23, 1), favorite: true, markedAt: at(4) },
    ]);
  });
});

it("lists marks in Bible order, not in the order they were made", () => {
  const order: Record<string, number> = { genesis: 1, psalms: 19, john: 43 };
  const sorted = sortVerseMarks(
    [verse("john", 3, 16), verse("genesis", 1, 1), verse("john", 1, 14), verse("psalms", 23, 1)],
    (bookId) => order[bookId] ?? 99,
  );
  expect(sorted.map((mark) => `${mark.bookId} ${mark.chapter}:${mark.verse}`)).toEqual([
    "genesis 1:1",
    "psalms 23:1",
    "john 1:14",
    "john 3:16",
  ]);
});
