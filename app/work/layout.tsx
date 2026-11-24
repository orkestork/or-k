import type { Metadata } from "next";
import { Anton, DM_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/work/theme/theme-provider";
import { THEME_BOOTSTRAP } from "@/components/work/theme/theme";
import "./work.css";

// Tipografías de marca (Manual de identidad 2026): DM Sans para interfaz,
// Anton para titulares.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "O R-K WORK",
  description: "Operación interna de O R-K — solicitudes, proyectos, revisión y entregas.",
  robots: { index: false, follow: false },
};

/**
 * Layout for the O R-K WORK module. Everything lives inside `[data-orkwork]`,
 * which re-establishes a clean baseline over the public site's global reset
 * (app/globals.css). `work.css` is imported here only, so Next scopes it to
 * `/work/*` — the marketing site never loads it.
 *
 * The inline bootstrap script sets the light/dark class on the wrapper before
 * first paint (no flash); ThemeProvider keeps it in sync afterwards.
 */
export default function WorkLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      data-orkwork=""
      suppressHydrationWarning
      className={`${dmSans.variable} ${anton.variable} ${geistMono.variable} font-sans antialiased`}
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}
