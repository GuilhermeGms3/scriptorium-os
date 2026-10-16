import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteError } from "./components/layout/route-error";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Guide/trace navigation resets the workbench scroller; preserve Reader restoration.
    scrollToTopSelectors: ["main:has([data-study-guide])", "main:has([data-knowledge-trace])"],
    defaultPreloadStaleTime: 0,
    // A failing page keeps the menu: without this, any route error replaced the whole shell.
    defaultErrorComponent: RouteError,
  });

  return router;
};
