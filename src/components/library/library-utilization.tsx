import { libraryUtilization } from "../../lib/repositories/library-utilization-repository";
import type { TraceFilter } from "../../lib/domain/knowledge-trace";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { AppLink } from "../common/app-link";
import { Button } from "../ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../ui/table";
import type { ReactNode } from "react";
import type { LibraryUtilization } from "../../lib/repositories/library-utilization-repository";

export function LibraryUtilizationReport({
  filter,
  renderFilters,
}: {
  filter: TraceFilter;
  renderFilters?: (rows: LibraryUtilization[]) => ReactNode;
}) {
  const query = useWorkspaceQuery(
    ["library-utilization", filter],
    () => libraryUtilization(filter),
    { refreshOnKnowledgeChange: true },
  );
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-5 p-5 md:p-8">
      <header>
        <h1 className="font-serif text-2xl">Aproveitamento do acervo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Extraído → estruturado → ligado → disponível no leitor → auditado. Dados do workspace
          atual, não do pacote público.
        </p>
      </header>
      <p className="text-sm">
        “Disponível” conta ligações contextuais elegíveis, não versículos únicos nem cartões
        carregados simultaneamente. Citações confessionais não são comentários. “Auditado” exige
        confirmação individual ou de auditoria registrada; não significa verdade teológica. Filtros
        de fonte e passagem podem ser aplicados abaixo.
      </p>
      {query.isPending && <p role="status">Consultando o índice local…</p>}
      {query.error && (
        <p role="alert">
          Não foi possível consultar o acervo.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {query.data && (
        <>
          {renderFilters?.(query.data)}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Atualizar relatório
          </Button>
          {!query.data.length && <p role="status">Nenhum documento neste recorte.</p>}
          <Table>
            <TableCaption className="sr-only">Etapas reais por documento privado</TableCaption>
            <TableHeader>
              <TableRow>
                {[
                  "Obra",
                  "Páginas extraídas",
                  "Unidades",
                  "Ligações",
                  "Contextos disponíveis",
                  "Citações confessionais",
                  "Auditadas",
                ].map((h) => (
                  <TableHead className="p-3" key={h} scope="col">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((row) => (
                <TableRow key={row.id}>
                  <th scope="row" className="max-w-80 border-b p-3 font-normal">
                    <AppLink
                      className="underline"
                      href={`/library/document/${encodeURIComponent(row.id)}`}
                    >
                      {row.title}
                    </AppLink>
                    {row.extracted === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sem texto extraído; não pode alimentar contexto textual.
                      </p>
                    )}
                    {row.checksum ===
                      "2deaec3e7684cf9fe399fa11d7372c01c47ce74f2d33d7594f871d12a66e01bd" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Edição conferida: texto bíblico; aparato de notas não identificado. Não foi
                        transformado em comentários.
                      </p>
                    )}
                  </th>
                  {[
                    `${row.extracted}/${row.pages}`,
                    row.structured,
                    row.linked,
                    row.available,
                    row.proof_texts,
                    row.audited,
                  ].map((v, i) => (
                    <TableCell className="p-3 tabular-nums" key={i}>
                      {v}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  );
}
