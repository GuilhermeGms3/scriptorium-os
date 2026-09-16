export interface SearchResultBase {
  id: string;
  label: string;
  detail?: string;
  score: number;
  to?: string;
}

export type SearchResult =
  | (SearchResultBase & {
      kind: "scripture-passage";
      corpusId: string;
      editionId: string;
      workId: string;
      address: string;
    })
  | (SearchResultBase & {
      kind: "primary-source-passage";
      corpusId: string;
      editionId: string;
      workId: string;
      textUnitId: string;
      locator: string;
    })
  | (SearchResultBase & { kind: "concept"; entityId: string })
  | (SearchResultBase & { kind: "doctrine"; doctrineId: string })
  | (SearchResultBase & { kind: "theory"; theoryId: string })
  | (SearchResultBase & { kind: "source"; sourceId: string })
  | (SearchResultBase & { kind: "author"; authorId: string })
  | (SearchResultBase & { kind: "work"; workId: string })
  | (SearchResultBase & { kind: "citation"; citationId: string })
  | (SearchResultBase & { kind: "research-question"; researchQuestionId: string })
  | (SearchResultBase & { kind: "study"; studyId: string })
  | (SearchResultBase & { kind: "person"; entityId: string })
  | (SearchResultBase & { kind: "place"; entityId: string })
  | (SearchResultBase & { kind: "library-resource"; resourceId: string })
  | (SearchResultBase & {
      kind: "knowledge-record";
      recordKind: string;
      recordId: string;
    })
  | (SearchResultBase & { kind: "note"; noteId: string });
