import { useCallback, useEffect, useRef, useState } from "react";
import { LocalKnowledgePipelineService } from "../../lib/application/local-knowledge-pipeline-service";
import { PrivateDocumentOcrService } from "../../lib/application/private-document-ocr-service";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import {
  PipelineAuditRepository,
  type PipelineAuditItem,
} from "../../lib/repositories/pipeline-audit-repository";
import {
  PipelineInfoSchema,
  PipelineSettingsSchema,
  pipelineRequest,
} from "../../lib/semantic-engine/local-pipeline-client";
import type { z } from "zod";

const button = "rounded border border-input px-2 py-1 text-xs disabled:opacity-50";

export function LocalPipelinePanel({
  documentId,
  onChanged,
  disabled = false,
  onBusyChange,
}: {
  documentId: string;
  onChanged: () => Promise<void>;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const editions = ScriptureRepository.listEditions().filter((x) => x.language.startsWith("pt"));
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const [info, setInfo] = useState<z.infer<typeof PipelineInfoSchema>>();
  const [useLlm, setUseLlm] = useState(false);
  const [sourceSchemeConfirmed, setSourceSchemeConfirmed] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState("por+eng");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [audit, setAudit] =
    useState<Awaited<ReturnType<typeof PipelineAuditRepository.snapshot>>>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    setAudit(await PipelineAuditRepository.snapshot(documentId));
    setSelected(new Set());
  }, [documentId]);
  useEffect(() => {
    let active = true;
    const reload = () => {
      if (controller.current) return;
      void PipelineAuditRepository.snapshot(documentId)
        .then((value) => {
          if (active) {
            setAudit(value);
            const raw = value.job?.["configuration_json"];
            if (typeof raw === "string") {
              const settings = PipelineSettingsSchema.safeParse(JSON.parse(raw) as unknown);
              if (settings.success) {
                setEditionId(settings.data.editionId);
                setUseLlm(settings.data.useLlm);
                setSourceSchemeConfirmed(settings.data.sourceSchemeConfirmed);
              }
            }
          }
        })
        .catch((cause) => {
          if (active) setError(String(cause));
        });
    };
    reload();
    window.addEventListener("scriptorium:knowledge-changed", reload);
    return () => {
      active = false;
      controller.current?.abort();
      window.removeEventListener("scriptorium:knowledge-changed", reload);
    };
  }, [documentId]);
  const execute = async (work: (signal: AbortSignal) => Promise<void>) => {
    if (controller.current) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      await work(abort.signal);
      setMessage("Operação concluída.");
    } catch (cause) {
      setError(
        abort.signal.aborted
          ? "Operação pausada. O progresso salvo permite retomar."
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
      controller.current = null;
      try {
        await refresh();
        await onChanged();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
  };
  const review = (verdict: "confirmed" | "rejected") =>
    execute(async () => {
      await PipelineAuditRepository.review([...selected], verdict);
    });
  const evidence = (item: PipelineAuditItem) => {
    const value: unknown = JSON.parse(item.evidence_json);
    return value && typeof value === "object" && "evidenceQuote" in value
      ? String(value.evidenceQuote)
      : item.unit_text;
  };
  return (
    <fieldset
      disabled={disabled}
      className="mt-4 space-y-3 rounded border border-border p-3"
      aria-label="Pipeline local e auditoria"
    >
      <h3 className="text-sm font-medium">Conexão local e auditoria</h3>
      <p className="text-xs text-muted-foreground">
        OCR recupera páginas vazias sem alterar o original. Referências explícitas verificadas podem
        aparecer na leitura como máquina; inferências vão para exceções, sem aprovação automática
        baseada em confiança do modelo.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void execute(async (signal) => {
              setInfo(await pipelineRequest("info", PipelineInfoSchema, undefined, signal));
            })
          }
        >
          Verificar serviço local
        </button>
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void execute((signal) =>
              PrivateDocumentOcrService.recover(documentId, setMessage, signal, ocrLanguage),
            )
          }
        >
          Recuperar páginas com OCR
        </button>
        <label className="text-xs">
          Idiomas do OCR{" "}
          <select
            className="rounded border border-input bg-background p-1"
            value={ocrLanguage}
            disabled={busy}
            onChange={(event) => setOcrLanguage(event.target.value)}
          >
            <option value="por+eng">Português e inglês</option>
            <option value="spa+eng">Espanhol e inglês</option>
            <option value="por+eng+spa">Português, inglês e espanhol</option>
          </select>
        </label>
        <label className="text-xs">
          Edição de referência{" "}
          <select
            className="rounded border border-input bg-background p-1"
            value={editionId}
            disabled={busy}
            onChange={(event) => setEditionId(event.target.value)}
          >
            {editions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.abbreviation}
              </option>
            ))}
          </select>
        </label>
        <button
          className={button}
          disabled={busy || !editionId}
          onClick={() =>
            void execute((signal) =>
              LocalKnowledgePipelineService.indexEdition(editionId, setMessage, signal),
            )
          }
        >
          Preparar índice de candidatos
        </button>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={useLlm}
            disabled={busy}
            onChange={(event) => setUseLlm(event.target.checked)}
          />
          Inferir com LLM local
        </label>
        <button
          className={button}
          disabled={busy || !editionId}
          onClick={() =>
            void execute((signal) =>
              LocalKnowledgePipelineService.run(
                documentId,
                editionId,
                useLlm,
                setMessage,
                signal,
                sourceSchemeConfirmed,
              ),
            )
          }
        >
          Conectar / retomar livro
        </button>
        {busy ? (
          <button className={button} onClick={() => controller.current?.abort()}>
            Pausar
          </button>
        ) : null}
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={sourceSchemeConfirmed}
          disabled={busy}
          onChange={(event) => setSourceSchemeConfirmed(event.target.checked)}
        />
        Verifiquei que este livro usa a numeração da edição selecionada. Sem isso, referências
        explícitas também vão para exceções (especialmente Salmos/LXX).
      </label>
      {info ? (
        <p className="text-xs">
          OCR: {info.ocrAvailable ? "disponível" : "Tesseract não encontrado"} · Embeddings:{" "}
          {info.models.embedding.configured ? "configurados" : "não configurados"} · LLM:{" "}
          {info.models.llm.configured ? "configurado" : "não configurado"}. Configurado não
          significa conexão testada.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {audit ? (
        <>
          <p className="text-xs">
            Visíveis como máquina: {audit.counts["machine-visible"] ?? 0} · Exceções:{" "}
            {audit.counts["exception"] ?? 0} · Revogados: {audit.counts["revoked"] ?? 0} · Retomada:
            unidade {Number(audit.job?.["next_ordinal"] ?? 0)}.
          </p>
          <p className="text-xs text-muted-foreground">
            Sem decisão: {audit.receiptCounts["candidates"] ?? 0} · Abstenções:{" "}
            {audit.receiptCounts["abstained"] ?? 0} · Unidades acima do limite, não inferidas:{" "}
            {audit.receiptCounts["oversized"] ?? 0}.
          </p>
          <p className="text-xs text-muted-foreground">
            Amostra por livro: até 20 exceções e 20 ligações de máquina, ordenadas por checksum.
            Examine fonte e referência antes de confirmar. Esta amostra não é uma estimativa de
            precisão.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={busy || !audit.items.length}
              onClick={() => setSelected(new Set(audit.items.map((x) => x.proposal_id)))}
            >
              Selecionar janela
            </button>
            <button
              className={button}
              disabled={busy || !selected.size}
              onClick={() => void review("confirmed")}
            >
              Confirmar selecionados
            </button>
            <button
              className={button}
              disabled={busy || !selected.size}
              onClick={() => void review("rejected")}
            >
              Rejeitar selecionados
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Revogar todas as ligações automáticas deste livro? Revisões editoriais não serão alteradas.",
                  )
                )
                  void execute(async () => PipelineAuditRepository.revokeDocument(documentId));
              }}
            >
              Revogar ligações do livro
            </button>
          </div>
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {audit.items.map((item) => (
              <li key={item.proposal_id} className="rounded border border-border p-2 text-xs">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={selected.has(item.proposal_id)}
                    onChange={(event) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        if (event.target.checked) next.add(item.proposal_id);
                        else next.delete(item.proposal_id);
                        return next;
                      })
                    }
                  />
                  <span>
                    {item.origin === "explicit"
                      ? "Referência explícita"
                      : "Inferência — exige auditoria"}{" "}
                    · página {item.page_index + 1}
                  </span>
                </label>
                <p className="mt-1 text-muted-foreground">{evidence(item)}</p>
                <p className="mt-1">
                  {String(
                    (JSON.parse(item.payload_json) as { rawReference?: string }).rawReference ?? "",
                  )}
                </p>
              </li>
            ))}
          </ul>
          {audit.candidates.length ? (
            <details className="text-xs">
              <summary>Candidatos ainda sem decisão (até 10 unidades)</summary>
              <ul className="mt-2 space-y-2">
                {audit.candidates.map((result) => (
                  <li key={result.unitId}>
                    {result.retrieval === "fts5"
                      ? "Busca textual"
                      : "Busca textual + similaridade semântica"}
                    :{" "}
                    {result.candidates
                      .map(
                        (candidate) =>
                          `${candidate.passage.bookId} ${candidate.passage.chapter}:${candidate.passage.verseStart ?? ""}`,
                      )
                      .join("; ")}
                    . Nenhuma correspondência publicada.
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
