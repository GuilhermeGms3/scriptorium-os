/**
 * AppShell — the persistent research shell:
 *
 *   TopBar (search / command)
 *   Sidebar | Workspace | Study panel (only when opened)
 *   StatusBar
 *
 * The study panel opens when the reader selects a verse or a word. On wide screens it sits
 * beside the text; below 1280 px it slides over the text from the right; on phones it is a
 * bottom sheet. So the screen never holds more than three regions.
 */

import { Group, Panel, Separator } from "react-resizable-panels";
import { Drawer } from "vaul";
import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { useIsMobile } from "../../hooks/use-mobile";
import { useMediaQuery, WIDE_READING_QUERY } from "../../hooks/use-media-query";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PrimarySidebar } from "./primary-sidebar";
import { TopBar } from "./top-bar";
import { StatusBar } from "./status-bar";
import { MobileNav } from "./mobile-nav";
import { InspectorPanel } from "./inspector-panel";
import { CommandPalette } from "../search/command-palette";
import { t } from "../../lib/i18n";
import { supportsPassageInspector } from "./shell-route-context";
import { AudioMiniPlayer } from "../audio/audio-player";

export function AppShell({ children }: { children: ReactNode }) {
  const { inspectorOpen, setInspectorOpen, wordSelection, selectWord } = useWorkbench();
  const isMobile = useIsMobile();
  const isWide = useMediaQuery(WIDE_READING_QUERY);
  const pathname = useLocation({ select: (location) => location.pathname });
  const passageInspectorAvailable = supportsPassageInspector(pathname);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <PrimarySidebar />
        </div>

        {/* Notes and Search have no passage inspector. Keep these workspaces mounted across
            viewport changes so rotation cannot discard drafts, queries or external results. */}
        {isMobile || pathname === "/notes" || pathname === "/search" || pathname === "/audio" ? (
          <main className="min-w-0 flex-1 overflow-y-auto" id="workspace">
            {children}
          </main>
        ) : (
          <Group orientation="horizontal" className="min-w-0 flex-1" id="scriptorium-shell">
            <Panel defaultSize="74%" minSize="45%" className="min-w-0">
              <main className="h-full overflow-y-auto" id="workspace">
                {children}
              </main>
            </Panel>

            {passageInspectorAvailable && inspectorOpen && isWide && (
              <>
                <Separator
                  className="w-1 cursor-col-resize bg-border transition-colors hover:bg-ring"
                  aria-label={t("shell.resizeInspector")}
                />
                <Panel defaultSize="32%" minSize="320px" maxSize="45%" className="min-w-[320px]">
                  <aside
                    aria-label={t("shell.inspector")}
                    className="h-full overflow-hidden bg-card"
                  >
                    <InspectorPanel />
                  </aside>
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>

      <AudioMiniPlayer />
      <StatusBar />
      <MobileNav />
      <CommandPalette />

      {/* Below 1280 px the study panel slides over the text instead of squeezing it. */}
      <Sheet
        open={!isMobile && !isWide && passageInspectorAvailable && inspectorOpen}
        onOpenChange={(open) => {
          if (open) return;
          selectWord(null);
          setInspectorOpen(false);
        }}
      >
        <SheetContent
          side="right"
          className="w-[min(30rem,92vw)] p-0 sm:max-w-none [&>button:first-child]:hidden"
        >
          <SheetTitle className="sr-only">{t("shell.inspector")}</SheetTitle>
          <SheetDescription className="sr-only">
            Estudo do versículo selecionado: visão geral, texto, fontes e notas.
          </SheetDescription>
          <InspectorPanel />
        </SheetContent>
      </Sheet>

      {/* Mobile study panel as bottom sheet */}
      <Drawer.Root
        open={isMobile && passageInspectorAvailable && (!!wordSelection || inspectorOpen)}
        onOpenChange={(open) => {
          if (open) return;
          selectWord(null);
          setInspectorOpen(false);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78dvh] flex-col rounded-t-xl border-t border-border bg-card outline-none"
            aria-label={t("shell.inspector")}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InspectorPanel />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
