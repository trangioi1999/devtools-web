import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { JsonTree } from '../../components/JsonTree'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'

export function JsonViewerPage() {
  const [text, setText] = useState(() => loadJsonViewerContent())
  const [search, setSearch] = useState('')
  const [editorRef, setEditorRef] = useState<Parameters<OnMount>[0] | null>(null)
  const [monacoRef, setMonacoRef] = useState<Parameters<OnMount>[1] | null>(null)

  const parsed = useMemo(() => parseJsonStrict(text), [text])

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setText(next)
    saveJsonViewerContent(next)
  }

  const handleMount: OnMount = (editor, monacoInstance) => {
    setEditorRef(editor)
    setMonacoRef(monacoInstance)
  }

  const applyMarkers = (result: ReturnType<typeof parseJsonStrict>) => {
    if (!editorRef || !monacoRef) return
    const model = editorRef.getModel()
    if (!model) return

    if (result.ok) {
      monacoRef.editor.setModelMarkers(model, 'json-viewer', [])
      return
    }

    monacoRef.editor.setModelMarkers(
      model,
      'json-viewer',
      result.errors.map((e) => ({
        severity: monacoRef.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: e.line,
        startColumn: e.column,
        endLineNumber: e.line,
        endColumn: e.column + 1,
      })),
    )
  }

  useMemo(() => applyMarkers(parsed), [parsed, editorRef, monacoRef])

  const handleFormat = () => {
    if (!parsed.ok) return
    const formatted = JSON.stringify(parsed.value, null, 2)
    handleChange(formatted)
  }

  const handleMinify = () => {
    if (!parsed.ok) return
    handleChange(JSON.stringify(parsed.value))
  }

  const handleAutoFix = () => {
    const result = autoFixJson(text)
    if (result.fixed) handleChange(result.fixed)
  }

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path)
  }

  const handleCopyValue = (value: unknown) => {
    navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
        <button onClick={handleFormat} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Format</button>
        <button onClick={handleMinify} className="px-3 py-1 text-sm rounded bg-slate-200">Minify</button>
        <button onClick={handleAutoFix} className="px-3 py-1 text-sm rounded bg-amber-200">Auto-fix</button>
        <input
          placeholder="Search key/value…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-2 py-1 text-sm border border-slate-300 rounded"
        />
      </div>
      <div className="flex-1 grid grid-cols-2 min-h-0">
        <Editor
          language="json"
          value={text}
          onMount={handleMount}
          onChange={handleChange}
          options={{ minimap: { enabled: false }, fontSize: 13 }}
        />
        <div className="overflow-auto p-3 border-l border-slate-200">
          {parsed.ok ? (
            <JsonTree
              value={parsed.value}
              highlightQuery={search}
              onCopyPath={handleCopyPath}
              onCopyValue={handleCopyValue}
            />
          ) : (
            <div className="text-sm text-red-600">
              {parsed.errors.map((e, i) => (
                <div key={i}>Line {e.line}, col {e.column}: {e.message}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
