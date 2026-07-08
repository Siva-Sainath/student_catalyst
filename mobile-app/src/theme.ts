/**
 * Notion/Cursor dark black theme — modern, minimal, zinc-based surfaces with a professional blue accent.
 */
export const theme = {
  // Backgrounds - Notion/Cursor Dark Style
  bg:       "#09090b",   // zinc-950 (page background)
  surface:  "#18181b",   // zinc-900 (cards / panels)
  surface2: "#27272a",   // zinc-800 (inputs / secondary buttons)
  surface3: "#3f3f46",   // zinc-700 (active states / tabs)

  // Borders
  border:   "#27272a",   // clean zinc border
  border2:  "#3f3f46",

  // Text
  text:     "#fafafa",   // zinc-50 (primary text)
  soft:     "#d4d4d8",   // zinc-300 (body text)
  muted:    "#71717a",   // zinc-500 (labels / metadata)
  faint:    "#52525b",   // zinc-600 (placeholders)

  // Accent palette - Professional Blue & Cool Tones
  primary:  "#3b82f6",   // vibrant blue action color
  primaryBg:"#172554",   // dark blue highlight/selection tint
  success:  "#10b981",   // emerald green
  warn:     "#f59e0b",   // amber
  danger:   "#ef4444",   // red
  info:     "#0ea5e9",   // cyan

  // Status colours
  safe:    "#10b981",
  warning: "#f59e0b",

  // Gradient
  gradient: ["#18181b", "#09090b"] as const, // Subtle Notion-style card/hero gradient

  // Typography
  fontMono: "monospace" as const,
};
