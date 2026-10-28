"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { THEME_KEY, resolveTheme, type Theme } from "./theme";

type Ctx = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function apply(mode: "light" | "dark") {
  const el = document.querySelector<HTMLElement>("[data-orkwork]");
  if (!el) return;
  el.classList.remove("light", "dark");
  el.classList.add(mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  // Hydrate from storage on mount.
  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setResolved(resolveTheme(stored));
  }, []);

  // React to OS changes while on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = resolveTheme("system");
      setResolved(next);
      apply(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
    const next = resolveTheme(t);
    setResolved(next);
    apply(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Used when a consumer renders outside the provider (e.g. for a moment during
// a dev hot reload): it still works against the DOM/storage instead of
// taking the whole page down.
const FALLBACK: Ctx = {
  theme: "system",
  resolved: "dark",
  setTheme: (t) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // storage unavailable
    }
    apply(resolveTheme(t));
  },
};

export function useTheme() {
  return useContext(ThemeContext) ?? FALLBACK;
}
