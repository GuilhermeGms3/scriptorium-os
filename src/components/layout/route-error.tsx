import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportLovableError } from "../../lib/lovable-error-reporting";
import { t } from "../../lib/i18n";
import { EmptyState } from "./empty-state";

/**
 * A page that failed, shown inside the shell: the menu stays usable and "Tentar novamente" reloads
 * only this page. The technical message is kept, folded, for whoever needs to report it.
 */
export function RouteError({
  error,
  reset,
  title = t("error.loadTitle"),
  description = t("error.loadDescription"),
}: ErrorComponentProps & { title?: string; description?: string }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_route_error_component" });
  }, [error]);

  return (
    <div className="px-5 py-10 md:px-8">
      <EmptyState
        icon={AlertTriangle}
        title={title}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                reset();
                void router.invalidate();
              }}
            >
              {t("error.tryAgain")}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">{t("error.goHome")}</Link>
            </Button>
          </div>
        }
      >
        <p>{description}</p>
        {error.message && (
          <details className="mt-3 text-left text-xs">
            <summary className="cursor-pointer">Detalhe técnico</summary>
            <p className="mt-1 break-words font-mono">{error.message}</p>
          </details>
        )}
      </EmptyState>
    </div>
  );
}
