/**
 * WorkbenchContext — shared shell state: theme, inspector selection,
 * command palette, notes/studies access, reading preferences.
 * Deliberately framework-light and local-first.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PassageRef, TokenOccurrence } from "../domain/scripture";
import type { Note, NoteLink, Study } from "../domain/study";
import { StudyRepository } from "../repositories/study-repository";

export type ThemeMode = "light" | "dark" | "system";

export interface ReadingPreferences {
  fontSize: number; // rem
  lineHeight: number;
  verseMode: "verse" | "paragraph";
}

export interface WordSelection {
  token: TokenOccurrence;
  verseLabel: string; // e.g. "John 1:1"
}

export interface PassageContext {
  ref: PassageRef;
  label: string;
}

interface WorkbenchState {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolvedTheme: "light" | "dark";

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /** Inspector: when a word is selected, the inspector shows the Word view. */
  wordSelection: WordSelection | null;
  selectWord: (sel: WordSelection | null) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;

  /** Passage context for the Passage Inspector. */
  passageContext: PassageContext | null;
  setPassageContext: (context: PassageContext | null) => void;

  readingPrefs: ReadingPreferences;
  setReadingPrefs: (p: Partial<ReadingPreferences>) => void;

  notes: Note[];
  addNote: (title: string, body: string, links: NoteLink[]) => Promise<Note>;
  studies: Study[];
  createStudy: (title: string) => Promise<Study>;
  addToStudy: (
    studyId: string,
    item: Parameters<typeof StudyRepository.addStudyItem>[1],
  ) => Promise<void>;
  refreshUserData: () => Promise<void>;
  workspacePersistence: "loading" | "opfs" | "memory" | "unavailable";
}

const WorkbenchContext = createContext<WorkbenchState | null>(null);

const THEME_KEY = "scriptorium.theme.v1";
const PREFS_KEY = "scriptorium.reading-prefs.v1";

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (window.localStorage.getItem(THEME_KEY) as ThemeMode) || "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [wordSelection, setWordSelection] = useState<WordSelection | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [passageContext, setPassageContextState] = useState<PassageContext | null>(null);

  const [readingPrefs, setReadingPrefsState] = useState<ReadingPreferences>(() => {
    if (typeof window === "undefined")
      return { fontSize: 1.125, lineHeight: 1.85, verseMode: "verse" };
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      return raw
        ? { fontSize: 1.125, lineHeight: 1.85, verseMode: "verse", ...JSON.parse(raw) }
        : { fontSize: 1.125, lineHeight: 1.85, verseMode: "verse" };
    } catch {
      return { fontSize: 1.125, lineHeight: 1.85, verseMode: "verse" };
    }
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [workspacePersistence, setWorkspacePersistence] =
    useState<WorkbenchState["workspacePersistence"]>("loading");

  const refreshUserData = useCallback(async () => {
    await StudyRepository.refresh();
    setNotes(StudyRepository.listNotes());
    setStudies(StudyRepository.listStudies());
  }, []);

  useEffect(() => {
    let active = true;
    void StudyRepository.migrateLegacyLocalStorage()
      .then(refreshUserData)
      .then(async () => {
        const { getWorkspaceDatabase } = await import("../workspace-runtime/workspace-database");
        const database = await getWorkspaceDatabase();
        if (active) setWorkspacePersistence(database.persistence);
      })
      .catch(() => {
        if (active) setWorkspacePersistence("unavailable");
      });
    return () => {
      active = false;
    };
  }, [refreshUserData]);

  // Theme resolution
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      setResolvedTheme(dark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    window.localStorage.setItem(THEME_KEY, t);
  }, []);

  const setReadingPrefs = useCallback((p: Partial<ReadingPreferences>) => {
    setReadingPrefsState((prev) => {
      const next = { ...prev, ...p };
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Apply reading prefs as CSS variables on <html> (reader picks them up).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reading-size", `${readingPrefs.fontSize}rem`);
    root.style.setProperty("--reading-leading", `${readingPrefs.lineHeight}`);
  }, [readingPrefs]);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectWord = useCallback((sel: WordSelection | null) => {
    setWordSelection(sel);
    if (sel) setInspectorOpen(true);
  }, []);

  const setPassageContext = useCallback((context: PassageContext | null) => {
    setPassageContextState(context);
    if (context === null) setWordSelection(null);
  }, []);

  const addNote = useCallback(
    async (title: string, body: string, links: NoteLink[]) => {
      const note = await StudyRepository.createNote({ title, body, links });
      await refreshUserData();
      return note;
    },
    [refreshUserData],
  );

  const createStudy = useCallback(
    async (title: string) => {
      const study = await StudyRepository.createStudy(title);
      await refreshUserData();
      return study;
    },
    [refreshUserData],
  );

  const addToStudy = useCallback(
    async (studyId: string, item: Parameters<typeof StudyRepository.addStudyItem>[1]) => {
      await StudyRepository.addStudyItem(studyId, item);
      await refreshUserData();
    },
    [refreshUserData],
  );

  const value = useMemo<WorkbenchState>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      paletteOpen,
      setPaletteOpen,
      wordSelection,
      selectWord,
      inspectorOpen,
      setInspectorOpen,
      passageContext,
      setPassageContext,
      readingPrefs,
      setReadingPrefs,
      notes,
      addNote,
      studies,
      createStudy,
      addToStudy,
      refreshUserData,
      workspacePersistence,
    }),
    [
      theme,
      setTheme,
      resolvedTheme,
      paletteOpen,
      wordSelection,
      selectWord,
      inspectorOpen,
      passageContext,
      setPassageContext,
      readingPrefs,
      setReadingPrefs,
      notes,
      addNote,
      studies,
      createStudy,
      addToStudy,
      refreshUserData,
      workspacePersistence,
    ],
  );

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench(): WorkbenchState {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbench must be used within WorkbenchProvider");
  return ctx;
}
