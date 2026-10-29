import { useEffect, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { printJobs, setPrintPreparer } from "./print-jobs";
import "./print.css";

/**
 * Holds the document that goes to paper, hidden on screen. Only when the browser is about to print
 * does it render the current screen's document and hide everything else (see print.css). It stays
 * in place afterwards because phones may still be laying out the PDF after "afterprint".
 */
export function PrintHost() {
  const [content, setContent] = useState<{ id: number; node: ReactNode } | null>(null);
  useEffect(() => {
    let screenTitle: string | null = null;
    const before = () => {
      const current = printJobs.current();
      document.documentElement.classList.toggle("print-document-active", Boolean(current));
      if (!current) {
        flushSync(() => setContent(null));
        return;
      }
      flushSync(() => setContent({ id: current.id, node: current.job.render() }));
      screenTitle ??= document.title;
      // The browser offers the page title as the name of the PDF.
      document.title = current.job.title;
    };
    const after = () => {
      if (screenTitle !== null) document.title = screenTitle;
      screenTitle = null;
    };
    setPrintPreparer(before);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    // The screen that owned the document closed: nothing of it stays behind.
    const unsubscribe = printJobs.subscribe(() =>
      setContent((shown) => (shown && printJobs.has(shown.id) ? shown : null)),
    );
    return () => {
      after();
      setPrintPreparer(null);
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      unsubscribe();
    };
  }, []);
  if (!content) return null;
  return createPortal(<div className="print-root">{content.node}</div>, document.body);
}
