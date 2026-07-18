import type { Monaco } from '@monaco-editor/react'

export const CLASSICAL_THEME = 'classical'

/** Registers the Classical light Monaco theme; safe to call multiple times. */
export function defineClassicalTheme(monaco: Monaco): void {
  monaco.editor.defineTheme(CLASSICAL_THEME, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '7d5411' },
      { token: 'string.value.json', foreground: '4b7d5f' },
      { token: 'number.json', foreground: '5470a8' },
      { token: 'keyword.json', foreground: '93538e' },
    ],
    colors: {
      'editor.background': '#f3f2f2',
      'editor.foreground': '#201f1d',
      'editorLineNumber.foreground': '#bab6b6',
      'editorLineNumber.activeForeground': '#7d5411',
      'editorCursor.foreground': '#b68235',
      'editor.selectionBackground': '#e1ad6650',
      'editor.inactiveSelectionBackground': '#eae7e780',
      'editorIndentGuide.background': '#d7d3d3',
      'editorIndentGuide.activeBackground': '#bab6b6',
      'editorWhitespace.foreground': '#d7d3d3',
      'editorGutter.background': '#f3f2f2',
      'editorWidget.background': '#eae9e9',
      'editorWidget.border': '#d7d3d3',
      'editorSuggestWidget.background': '#eae9e9',
      'scrollbarSlider.background': '#d7d3d380',
    },
  })
}
