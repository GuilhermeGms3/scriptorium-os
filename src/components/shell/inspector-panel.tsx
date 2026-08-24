/**
 * InspectorPanel — right-hand inspector. Shows the Word Inspector when a
 * token is selected, otherwise the Passage Inspector for the current context.
 */

import { useWorkbench } from "../../lib/workbench/workbench-context";
import { WordInspector } from "../scripture/word-inspector";
import { PassageInspector } from "../scripture/passage-inspector";

export function InspectorPanel() {
  const { wordSelection } = useWorkbench();

  if (wordSelection) {
    return <WordInspector selection={wordSelection} />;
  }
  return <PassageInspector />;
}
