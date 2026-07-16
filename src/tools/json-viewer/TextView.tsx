import Editor from '@monaco-editor/react'

export function TextView({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)

  return (
    <Editor
      language="json"
      value={text}
      options={{ minimap: { enabled: false }, fontSize: 13, readOnly: true }}
    />
  )
}
