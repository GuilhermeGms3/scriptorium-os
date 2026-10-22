/**
 * BookChapterPicker — the book and chapter being read, as one button. It opens a window with the
 * books by testament and a search field, then the chapters in large numbers; nothing stays open
 * beside the text.
 */

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Book } from "../../lib/domain/scripture";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import {
  groupScriptureBooks,
  type ScriptureBookGroup,
} from "../../lib/content/scripture-navigation";
import { bookLabel } from "../../lib/i18n";
import { cn } from "../../lib/utils";

type Testament = "old" | "new" | "other";

const TESTAMENT_OF_GROUP: Record<string, Testament> = {
  pentateuco: "old",
  historicos: "old",
  poeticos: "old",
  "profetas-maiores": "old",
  "profetas-menores": "old",
  "evangelhos-atos": "new",
  "cartas-paulinas": "new",
  "cartas-gerais": "new",
  apocaliptico: "new",
};

const TESTAMENT_LABELS: Record<Testament, string> = {
  old: "Antigo Testamento",
  new: "Novo Testamento",
  other: "Outros textos",
};

const testamentOfGroup = (group: ScriptureBookGroup): Testament =>
  TESTAMENT_OF_GROUP[group.id] ?? "other";

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .trim();
}

function BookButton({
  book,
  active,
  onChoose,
}: {
  book: Book;
  active: boolean;
  onChoose: (book: Book) => void;
}) {
  const chapters = ScriptureKnowledgeEngine.availableChapters(book.id);
  const available = chapters.length > 0;
  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onChoose(book)}
      title={available ? undefined : "O texto deste livro ainda não está instalado"}
      className={cn(
        "flex min-h-10 w-full items-center rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-primary bg-primary/10 font-medium"
          : "border-border hover:border-primary/50 hover:bg-accent",
      )}
    >
      {bookLabel(book.id, book.name)}
    </button>
  );
}

export function BookChapterPicker({ book, chapter }: { book: Book; chapter: number }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Book | null>(null);
  const groups = useMemo(() => groupScriptureBooks(ScriptureKnowledgeEngine.listBooks()), []);
  const currentTestament = useMemo(() => {
    const group = groups.find((item) => item.books.some((candidate) => candidate.id === book.id));
    return group ? testamentOfGroup(group) : "old";
  }, [book.id, groups]);
  const [testament, setTestament] = useState<Testament>(currentTestament);
  const testaments = (["old", "new", "other"] as const).filter((value) =>
    groups.some((group) => testamentOfGroup(group) === value && group.books.length),
  );
  const matches = useMemo(() => {
    const term = plain(query);
    if (!term) return [];
    return groups
      .flatMap((group) => group.books)
      .filter(
        (candidate) =>
          plain(bookLabel(candidate.id, candidate.name)).includes(term) ||
          plain(candidate.name).includes(term),
      );
  }, [groups, query]);

  const label = bookLabel(book.id, book.name);
  const choose = (target: Book) => {
    const chapters = ScriptureKnowledgeEngine.availableChapters(target.id);
    if (chapters.length === 1) {
      setOpen(false);
      void navigate({
        to: "/scripture/$book/$chapter",
        params: { book: target.id, chapter: String(chapters[0]) },
      });
      return;
    }
    setChosen(target);
  };
  const chosenChapters = chosen ? ScriptureKnowledgeEngine.availableChapters(chosen.id) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setChosen(null);
          setQuery("");
          setTestament(currentTestament);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Escolher livro e capítulo. Agora: ${label} ${chapter}`}
          className="inline-flex h-9 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-input px-3 font-serif text-base font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* One line always; a long book name ("1 Tessalonicenses") is cut, the chapter is not. */}
          <span className="max-w-[7.5rem] truncate @min-[28rem]:max-w-none">{label}</span>
          <span>{chapter}</span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-serif text-xl">
            {chosen ? bookLabel(chosen.id, chosen.name) : "Escolha um livro"}
          </DialogTitle>
          <DialogDescription>
            {chosen
              ? "Escolha o capítulo que quer ler."
              : "Procure pelo nome ou percorra os livros de cada testamento."}
          </DialogDescription>
        </DialogHeader>

        {chosen ? (
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            <button
              type="button"
              onClick={() => setChosen(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Todos os livros
            </button>
            <ul
              className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8"
              aria-label={`Capítulos de ${bookLabel(chosen.id, chosen.name)}`}
            >
              {chosenChapters.map((number) => {
                const current = chosen.id === book.id && number === chapter;
                return (
                  <li key={number}>
                    <Link
                      to="/scripture/$book/$chapter"
                      params={{ book: chosen.id, chapter: String(number) }}
                      onClick={() => setOpen(false)}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-md border text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50 hover:bg-accent",
                      )}
                    >
                      {number}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-5 pt-4">
              <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Procurar livro</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Procurar livro… (ex.: Salmos, João)"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            {query.trim() ? (
              <div className="min-h-0 overflow-y-auto px-5 py-4">
                {matches.length ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {matches.map((candidate) => (
                      <li key={candidate.id}>
                        <BookButton
                          book={candidate}
                          active={candidate.id === book.id}
                          onChoose={choose}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum livro com esse nome. Tente parte do nome, sem acentos.
                  </p>
                )}
              </div>
            ) : (
              <Tabs
                value={testament}
                onValueChange={(value) => setTestament(value as Testament)}
                className="flex min-h-0 flex-1 flex-col"
              >
                <TabsList className="mx-5 mt-3 w-fit">
                  {testaments.map((value) => (
                    <TabsTrigger key={value} value={value} className="text-sm">
                      {TESTAMENT_LABELS[value]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {testaments.map((value) => (
                  <TabsContent
                    key={value}
                    value={value}
                    className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
                  >
                    {groups
                      .filter((group) => testamentOfGroup(group) === value)
                      .map((group) => (
                        <section key={group.id} aria-label={group.label}>
                          <h3 className="text-sm font-medium text-muted-foreground">
                            {group.label}
                          </h3>
                          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {group.books.map((candidate) => (
                              <li key={candidate.id}>
                                <BookButton
                                  book={candidate}
                                  active={candidate.id === book.id}
                                  onChoose={choose}
                                />
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
