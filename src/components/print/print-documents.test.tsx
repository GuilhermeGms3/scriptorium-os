import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ResearchQuestion } from "../../lib/domain/research";
import type { Note, Study } from "../../lib/domain/study";
import { ChapterPrint } from "./chapter-print";
import type { ChapterPrintModel } from "./chapter-print-model";
import { NotePrint } from "./note-print";
import { StudyPrint } from "./study-print";

const NOW = "2026-10-27T12:00:00.000Z";
const printedAt = new Date(NOW);

function note(id: string, title: string, body: string): Note {
  return { id, title, body, links: [], createdAt: NOW, updatedAt: NOW };
}

/** Text only, tags dropped: what the reader sees on paper. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("estudo impresso", () => {
  const study: Study = {
    id: "study:graca",
    slug: "graca",
    title: "A graça em Romanos",
    description: "Leitura dos capítulos 3 a 5",
    items: [
      {
        id: "item:1",
        kind: "passage",
        refId: "romans:5:1",
        label: "Rm 5:1",
        passageRef: { bookId: "romans", chapter: 5, verseStart: 1, verseEnd: 5 },
        addedAt: NOW,
      },
      { id: "item:2", kind: "concept", refId: "concept:graca", label: "Graça", addedAt: NOW },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
  const question: ResearchQuestion = {
    id: "question:1",
    question: "O que Paulo quer dizer com justificação?",
    status: "provisional",
    links: [],
    provisionalConclusion: "Um veredito de Deus, recebido pela fé.",
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("prints questions, gathered material and every note, in plain Portuguese", () => {
    const notes = [1, 2, 3, 4].map((index) =>
      note(`note:${index}`, `Nota ${index}`, index === 1 ? "Ver [[Nota 2]] e **fé**." : ""),
    );
    const html = renderToStaticMarkup(
      <StudyPrint
        study={study}
        questions={[question]}
        notes={notes}
        allNotes={notes}
        printedAt={printedAt}
      />,
    );
    const page = text(html);
    expect(page).toContain("Estudo A graça em Romanos Leitura dos capítulos 3 a 5");
    expect(page).toContain("O que Paulo quer dizer com justificação?");
    expect(page).toContain("Provisória");
    expect(page).not.toContain("provisional");
    expect(page).toContain("Conclusão provisória: Um veredito de Deus, recebido pela fé.");
    expect(page).toMatch(/Romanos 5:1.5/u);
    expect(page).toContain("Graça");
    // All four notes, not just the first three shown on screen.
    expect(page).toContain("Nota 4");
    expect(html).toContain("<strong>fé</strong>");
    // On paper a link to another note is its title, never a button.
    expect(html).not.toContain("<button");
    expect(page).toContain("Nota sem texto.");
    expect(page).toContain("impresso em 27 de outubro de 2026");
  });

  it("says so instead of printing empty sections", () => {
    const page = text(
      renderToStaticMarkup(
        <StudyPrint
          study={{ ...study, items: [] }}
          questions={[]}
          notes={[]}
          allNotes={[]}
          printedAt={printedAt}
        />,
      ),
    );
    expect(page).toContain("Este estudo ainda não tem perguntas, material reunido ou notas.");
    expect(page).not.toContain("Perguntas de pesquisa");
    expect(page).not.toContain("Material reunido");
  });
});

describe("nota impressa", () => {
  it("prints the note with its study, folder and source", () => {
    const page = text(
      renderToStaticMarkup(
        <NotePrint
          title="Justificação"
          body={"# Tese\n\n> Citação de Lutero"}
          place="A graça em Romanos / Capítulo 5"
          source={{
            kind: "private-document",
            documentId: "document:lutero",
            title: "Comentário aos Romanos",
            page: 12,
          }}
          notes={[]}
          printedAt={printedAt}
        />,
      ),
    );
    expect(page).toContain("Nota Justificação A graça em Romanos / Capítulo 5");
    expect(page).toContain("Fonte: Comentário aos Romanos · p. 12");
    expect(page).toContain("Tese Citação de Lutero");
  });

  it("names an untitled, empty note instead of printing a blank page", () => {
    const page = text(
      renderToStaticMarkup(<NotePrint title="  " body="" notes={[]} printedAt={printedAt} />),
    );
    expect(page).toContain("Nota sem título");
    expect(page).toContain("Esta nota ainda não tem texto.");
  });
});

describe("capítulo impresso", () => {
  const comment = {
    id: "comment:1",
    source: "Comentário de Orígenes · p. 12",
    passage: "vv. 2–3",
    text: "O Verbo estava junto de Deus.",
    provenance: "Comentário original da fonte · ligação confirmada",
  };
  const model: ChapterPrintModel = {
    overview: [],
    verses: [
      { verse: 1, text: "No princípio era o Verbo", startsParagraph: true, comments: [] },
      { verse: 2, text: "Ele estava com Deus", startsParagraph: false, comments: [comment] },
      { verse: 3, text: "Tudo foi feito por ele", startsParagraph: false, comments: [] },
      { verse: 4, text: null, startsParagraph: true, comments: [] },
    ],
  };

  it("runs verses together in paragraph mode, breaking where a comment opens", () => {
    const html = renderToStaticMarkup(
      <ChapterPrint
        title="João 1"
        edition="Bíblia Livre · com comentários"
        model={model}
        verseMode="paragraph"
        direction="ltr"
        notes={["Texto: Bíblia Livre · licença CC-BY-3.0-BR."]}
        printedAt={printedAt}
      />,
    );
    expect(html.match(/class="pd-paragraph"/g)).toHaveLength(3);
    const page = text(html);
    expect(page).toContain("1 No princípio era o Verbo 2 Ele estava com Deus");
    expect(page).toContain(
      "Comentário de Orígenes · p. 12 · vv. 2–3 O Verbo estava junto de Deus. Comentário original da fonte",
    );
    expect(page).toContain("4 texto indisponível nesta edição");
    expect(page).toContain("Texto: Bíblia Livre · licença CC-BY-3.0-BR.");
    expect(page).not.toContain("Panorama do capítulo");
  });

  it("gives each verse its own line in verse mode and prints the panorama first", () => {
    const html = renderToStaticMarkup(
      <ChapterPrint
        title="João 1"
        edition="Bíblia Livre"
        model={{ ...model, overview: [{ ...comment, id: "overview", passage: "João 1" }] }}
        verseMode="verse"
        direction="ltr"
        notes={[]}
        printedAt={printedAt}
      />,
    );
    expect(html.match(/class="pd-verse"/g)).toHaveLength(4);
    expect(text(html).indexOf("Panorama do capítulo")).toBeLessThan(
      text(html).indexOf("No princípio"),
    );
  });
});
