"use client";

import { useEffect, useState } from "react";

/**
 * Overlays (dialogs, menus, selects…) must mount inside `[data-orkwork]` so
 * they inherit the workspace theme instead of the marketing site's globals.
 */
export function useWorkPortalContainer() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>("[data-orkwork]"));
  }, []);
  return container;
}
