export interface FoundationSource {
  title: string;
  url: string;
  locator: string;
  perspective: string;
  supports: string;
  limit: string;
}
export interface StudyFoundation {
  claim: string;
  area:
    | "Filosofia"
    | "Teologia"
    | "História"
    | "Leitura textual"
    | "Arqueologia"
    | "Antropologia social";
  status:
    | "Argumento"
    | "Interpretação"
    | "Testemunho textual"
    | "Registro material"
    | "Bibliografia temática";
  basis: string;
  sources: readonly FoundationSource[];
  alternatives: string;
}
