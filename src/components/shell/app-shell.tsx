/**
 * AppShell — the persistent research shell:
 *
 *   TopBar (search / command)
 *   Sidebar | Workspace (resizable) | Inspector
 *   StatusBar
 *
 * On mobile the sidebar becomes a bottom nav and the inspector becomes
 * a bottom sheet (opened by selecting a word or tapping "Details").
 */

import { Group, Panel, Separator } from "react-resizable-panels";
import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { useIsMobile } from "../../hooks/use-mobile";
import { PrimarySidebar } from "./primary-sidebar";
import { TopBar } from "./top-bar";
import { StatusBar } from "./status-bar";
import { MobileNav } from "./mobile-nav";
import { InspectorPanel } from "./inspector-panel";
import { CommandPalette } from "../search/command-palette";
import { t } from "../../lib/i18n";

export function AppShell({ children }: { children: ReactNode }) {
  const { inspectorOpen, wordSelection, selectWord } = useWorkbench();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <PrimarySidebar />
        </div>

        {isMobile ? (
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

            {inspectorOpen && (
              <>
                <Separator
                  className="w-1 cursor-col-resize bg-border transition-colors hover:bg-ring"
                  aria-label={t("shell.resizeInspector")}
                />
                <Panel defaultSize="26%" minSize="240px" maxSize="40%" className="min-w-[240px]">
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

      <StatusBar />
      <MobileNav />
      <CommandPalette />

      {/* Mobile inspector as bottom sheet */}
      <Drawer.Root
        open={isMobile && !!wordSelection}
        onOpenChange={(open) => {
          if (!open) selectWord(null);
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
