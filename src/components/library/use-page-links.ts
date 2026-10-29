import { useEffect, useState } from "react";
import { WorkspacePassageKnowledgeService } from "../../lib/application/workspace-passage-knowledge-service";
import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";
import { DocumentKnowledgeRepository } from "../../lib/repositories/document-knowledge-repository";

export interface PageLinks {
  items?: WorkspacePassageKnowledgeItem[];
  analyzed: boolean;
  error?: string;
}

/** Bible references detected on the open page, reloaded after every knowledge change. */
export function usePageLinks(documentId: string, pageIndex: number): PageLinks {
  const [state, setState] = useState<PageLinks>({ analyzed: false });
  useEffect(() => {
    let active = true;
    let generation = 0;
    const load = () => {
      const request = ++generation;
      void Promise.all([
        WorkspacePassageKnowledgeService.loadDocumentPage(documentId, pageIndex),
        DocumentKnowledgeRepository.getSummary(documentId),
      ]).then(
        ([items, summary]) => {
          if (active && request === generation)
            setState({ items, analyzed: summary?.status === "ready" });
        },
        (cause: unknown) => {
          if (active && request === generation)
            setState({
              analyzed: false,
              error: cause instanceof Error ? cause.message : String(cause),
            });
        },
      );
    };
    setState({ analyzed: false });
    load();
    window.addEventListener("scriptorium:knowledge-changed", load);
    return () => {
      active = false;
      window.removeEventListener("scriptorium:knowledge-changed", load);
    };
  }, [documentId, pageIndex]);
  return state;
}
