import { BookOpen, Globe2, GraduationCap } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export type SearchScope = "local" | "academic" | "web";
export function SearchAtlasHeader({
  scope,
  onScope,
}: {
  scope: SearchScope;
  onScope: (scope: SearchScope) => void;
}) {
  return (
    <header className="search-atlas-header">
      <p className="meta-label">Caminhos de investigação</p>
      <h1>Explore o conhecimento</h1>
      <p className="search-atlas-description">
        Da passagem aos seus livros. Dos seus livros às fontes do mundo.
      </p>
      <div className="search-tree-root" aria-hidden="true">
        <span>Pesquisa</span>
      </div>
      <ToggleGroup
        type="single"
        value={scope}
        onValueChange={(value) => {
          if (value === "local" || value === "academic" || value === "web") onScope(value);
        }}
        aria-label="Onde pesquisar"
        className="search-tree-branches"
      >
        <ToggleGroupItem value="local" className="search-tree-branch">
          <BookOpen aria-hidden="true" className="size-5" />
          <span>
            Meu acervo<small>Bíblia, livros, notas e estudos</small>
          </span>
        </ToggleGroupItem>
        <ToggleGroupItem value="academic" className="search-tree-branch">
          <GraduationCap aria-hidden="true" className="size-5" />
          <span>
            Pesquisa acadêmica<small>Artigos, teses e referências</small>
          </span>
        </ToggleGroupItem>
        <ToggleGroupItem value="web" className="search-tree-branch">
          <Globe2 aria-hidden="true" className="size-5" />
          <span>
            Na web<small>Google e bibliotecas do mundo</small>
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
    </header>
  );
}
