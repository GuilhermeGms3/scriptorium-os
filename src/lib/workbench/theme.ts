export const THEMES = [
  { id: "light", label: "Branco" },
  { id: "dark", label: "Preto" },
  { id: "gray", label: "Cinza" },
  { id: "brown", label: "Marrom" },
  { id: "system", label: "Sistema" },
] as const;

export type ThemeMode = (typeof THEMES)[number]["id"];
export type ResolvedTheme = Exclude<ThemeMode, "system">;

export function parseTheme(value: unknown): ThemeMode {
  return THEMES.find((theme) => theme.id === value)?.id ?? "system";
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

// Runs before first paint; keep in sync with resolveTheme and the provider.
export const THEME_INIT = `(function(){try{var t=localStorage.getItem('scriptorium.theme.v1');if(!['light','dark','gray','brown','system'].includes(t))t='system';if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t!=='light')}catch(e){}})()`;
