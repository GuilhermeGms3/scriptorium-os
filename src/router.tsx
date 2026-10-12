import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Only topic guides reset the workbench scroller; preserve Reader restoration.
    scrollToTopSelectors: ["main:has([data-study-guide])"],
    defaultPreloadStaleTime: 0,
  });

  return router;
};
