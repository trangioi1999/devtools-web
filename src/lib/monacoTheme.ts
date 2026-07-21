import type { Monaco } from "@monaco-editor/react";

export const CLASSICAL_THEME = "classical";

let fontsRemeasured = false;

/**
 * Monaco measures character widths as soon as an editor mounts. Our UI fonts
 * (JetBrains Mono included) load asynchronously via a Google Fonts <link>,
 * so on a fresh load Monaco often measures against the fallback font first.
 * Once the real font swaps in, glyphs render wider than Monaco's cached
 * metrics — selections, the cursor, and word-wrap all end up computed
 * against the narrower fallback width, so a selection can visually stop
 * short of where the (now wider) text actually ends. Re-measuring once the
 * webfont is confirmed loaded keeps them in sync.
 */
function remeasureFontsWhenReady(monaco: Monaco): void {
  if (fontsRemeasured || typeof document === "undefined" || !("fonts" in document)) return;
  fontsRemeasured = true;
  document.fonts.ready.then(() => monaco.editor.remeasureFonts());
}

/** Registers the Classical light Monaco theme; safe to call multiple times. */
export function defineClassicalTheme(monaco: Monaco): void {
  remeasureFontsWhenReady(monaco);
  monaco.editor.defineTheme(CLASSICAL_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '0451a5' },
      { token: 'string.value.json', foreground: 'a31515' },
      { token: 'number.json', foreground: '098658' },
      { token: 'keyword.json', foreground: '005cc5' },
    ],
    colors: {
      "editor.background": "#f3f2f2",
      "editor.foreground": "#201f1d",
      "editorLineNumber.foreground": "#bab6b6",
      "editorLineNumber.activeForeground": "#7d5411",
      "editorCursor.foreground": "#b68235",
      "editor.selectionBackground": "#e1ad6650",
      "editor.inactiveSelectionBackground": "#eae7e780",
      "editorIndentGuide.background": "#d7d3d3",
      "editorIndentGuide.activeBackground": "#bab6b6",
      "editorWhitespace.foreground": "#d7d3d3",
      "editorGutter.background": "#f3f2f2",
      "editorWidget.background": "#eae9e9",
      "editorWidget.border": "#d7d3d3",
      "editorSuggestWidget.background": "#eae9e9",
      "scrollbarSlider.background": "#d7d3d380",
    },
  });
}
