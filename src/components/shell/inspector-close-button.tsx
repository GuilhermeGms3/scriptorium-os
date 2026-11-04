import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkbench } from "../../lib/workbench/workbench-context";

/** The visible way out of the study panel, labelled with a word and not only an icon. */
export function InspectorCloseButton() {
  const { setInspectorOpen, selectWord } = useWorkbench();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 shrink-0 gap-1.5"
      onClick={() => {
        selectWord(null);
        setInspectorOpen(false);
      }}
      aria-label="Fechar o painel de estudo"
    >
      <X className="size-4" aria-hidden="true" /> Fechar
    </Button>
  );
}
