import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VerseContent } from "../../lib/domain/scripture";
import { Verse } from "./verse";

const verse: VerseContent = {
  ref: { bookId: "john", chapter: 3, verseStart: 16, verseEnd: 16 },
  verse: 16,
  translations: { blivre: "Porque Deus amou o mundo" },
};

function render(mark?: { color?: "yellow" | "blue"; favorite: boolean }) {
  return renderToStaticMarkup(
    <Verse
      verse={verse}
      editionId="blivre"
      bookName="João"
      chapter={3}
      verseMode="verse"
      onSelect={() => {}}
      mark={mark}
    />,
  );
}

describe("versículo marcado no leitor", () => {
  it("paints only the text with the color and shows the star after the number", () => {
    const html = render({ color: "yellow", favorite: true });
    expect(html).toContain(
      '<span class="verse-mark verse-mark-yellow">Porque Deus amou o mundo</span>',
    );
    expect(html).toContain("lucide-star");
    // Said aloud too, not only seen.
    expect(html).toContain('aria-label="Selecionar João 3:16, marcado de amarelo, favorito"');
  });

  it("leaves an unmarked verse as it was", () => {
    const html = render();
    expect(html).not.toContain("verse-mark");
    expect(html).not.toContain("lucide-star");
    expect(html).toContain('aria-label="Selecionar João 3:16"');
  });
});
