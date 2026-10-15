import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_PROFILE_LABELS,
  DOCUMENT_PROFILES,
  type DocumentProfile,
  type DocumentProfileKind,
} from "../../lib/domain/document-profile";
import type { PrivateDocument } from "../../lib/domain/private-document";
import { DocumentProcessingRepository } from "../../lib/repositories/document-processing-repository";

/**
 * The profile the classifier detected for a book, and the researcher's correction. A confirmed
 * or corrected profile is stored as accepted and the classifier never replaces it.
 */
export function DocumentProfileControl({ document }: { document: PrivateDocument }) {
  const labelId = useId();
  const [profile, setProfile] = useState<DocumentProfile | null>();
  const [choice, setChoice] = useState<DocumentProfileKind>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setProfile(undefined);
    setSaved(false);
    setError(undefined);
    void DocumentProcessingRepository.ensureProfile(document).then(
      (value) => {
        if (!active) return;
        setProfile(value);
        setChoice(value.profile);
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      active = false;
    };
  }, [document]);

  const save = async () => {
    if (!choice) return;
    setSaving(true);
    setError(undefined);
    try {
      setProfile(await DocumentProcessingRepository.correctProfile(document.id, choice));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined && !error)
    return <p className="mt-1 text-[10px] italic text-muted-foreground">Identificando o perfil…</p>;

  const accepted = profile?.reviewStatus === "accepted";
  const unchanged = choice === profile?.profile;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
      <span id={labelId} className="text-muted-foreground">
        Perfil do livro
      </span>
      <Select
        value={choice ?? ""}
        onValueChange={(value) => {
          setChoice(value as DocumentProfileKind);
          setSaved(false);
        }}
        disabled={saving}
      >
        <SelectTrigger aria-labelledby={labelId} className="h-7 w-52 text-xs">
          <SelectValue placeholder="Escolha um perfil" />
        </SelectTrigger>
        <SelectContent>
          {DOCUMENT_PROFILES.map((kind) => (
            <SelectItem key={kind} value={kind} className="text-xs">
              {DOCUMENT_PROFILE_LABELS[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={!choice || saving || (accepted && unchanged)}
        onClick={() => void save()}
      >
        {saving ? (
          <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="size-3" aria-hidden="true" />
        )}
        {unchanged ? "Confirmar perfil" : "Salvar correção"}
      </Button>
      {profile && (
        <span className="flex items-center gap-1 text-muted-foreground">
          {accepted ? (
            "Confirmado por você"
          ) : (
            <>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
              Detectado automaticamente · confiança {Math.round(profile.confidence * 100)}%
            </>
          )}
        </span>
      )}
      {saved && (
        <p role="status" className="basis-full text-muted-foreground">
          Perfil salvo. Use “Reprocessar” em “Conhecimento do livro” para aplicar o novo perfil às
          ligações.
        </p>
      )}
      {error && (
        <p role="alert" className="basis-full text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
