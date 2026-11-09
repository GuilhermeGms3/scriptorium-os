import {
  BookOpen,
  GitBranch,
  HelpCircle,
  Highlighter,
  Home,
  Headphones,
  Library,
  NotebookPen,
  StickyNote,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { t } from "../../lib/i18n";

export interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Short explanation under the label, for items whose name alone is not obvious. */
  description?: string;
}

/** Grouped by what the reader wants to do: read, study, or open the library. */
export const NAVIGATION_GROUPS: readonly { label: string; items: readonly NavigationItem[] }[] = [
  {
    label: "Ler",
    items: [
      { to: "/", label: t("navigation.home"), icon: Home },
      { to: "/scripture", label: t("navigation.scripture"), icon: BookOpen },
      { to: "/highlights", label: "Marcações", icon: Highlighter },
      { to: "/audio", label: "Áudio", icon: Headphones },
      { to: "/search", label: t("navigation.search"), icon: Search },
    ],
  },
  {
    label: "Estudar",
    items: [
      { to: "/study", label: t("navigation.study"), icon: NotebookPen },
      { to: "/notes", label: "Notas", icon: StickyNote },
    ],
  },
  {
    label: "Biblioteca",
    items: [{ to: "/library", label: t("navigation.library"), icon: Library }],
  },
];

/** Technical and secondary destinations, shown quieter at the bottom. */
export const UTILITY_NAVIGATION: readonly NavigationItem[] = [
  {
    to: "/trace",
    label: "Rastro",
    icon: GitBranch,
    description: "Registro técnico das ligações",
  },
  { to: "/settings", label: t("navigation.settings"), icon: Settings },
  { to: "/about", label: t("navigation.helpAbout"), icon: HelpCircle },
];

export function isNavigationActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}
