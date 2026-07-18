import Editor from '@monaco-editor/react'
import { CLASSICAL_THEME, defineClassicalTheme } from '../../lib/monacoTheme'

export function TextView({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)

  return (
    <Editor
      language="json"
      value={text}
      theme={CLASSICAL_THEME}
      beforeMount={defineClassicalTheme}
      options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', readOnly: true }}
    />
  )
}
