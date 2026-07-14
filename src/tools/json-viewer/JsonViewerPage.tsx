import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { JsonTree } from '../../components/JsonTree'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { escapeJsonString, unescapeJsonString } from '../../lib/jsonEscape'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'
import { CompareView } from './CompareView'
import { ConvertModal } from './ConvertModal'
import { JsonPathPanel } from './JsonPathPanel'

type SubTab = 'editor' | 'compare'

export function JsonViewerPage() {
  const [subTab, setSubTab] = useState<SubTab>('editor')
  const [text, setText] = useState(() => loadJsonViewerContent())
  const [search, setSearch] = useState('')
  const [editorRef, setEditorRef] = useState<Parameters<OnMount>[0] | null>(null)
  const [monacoRef, setMonacoRef] = useState<Parameters<OnMount>[1] | null>(null)
  const [convertFormat, setConvertFormat] = useState<'yaml' | 'typescript' | null>(null)
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [escapeError, setEscapeError] = useState<string | null>(null)

  const parsed = useMemo(() => parseJsonStrict(text), [text])

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setText(next)
    saveJsonViewerContent(next)
    setEscapeError(null)
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
    handleChange(JSON.stringify(parsed.value, null, 2))
  }

  const handleMinify = () => {
    if (!parsed.ok) return
    handleChange(JSON.stringify(parsed.value))
  }

  const handleAutoFix = () => {
    const result = autoFixJson(text)
    if (result.fixed) handleChange(result.fixed)
  }

  const handleEscape = () => {
    handleChange(escapeJsonString(text))
    setEscapeError(null)
  }

  const handleUnescape = () => {
    const result = unescapeJsonString(text)
    if (result.ok) {
      handleChange(result.result)
      setEscapeError(null)
    } else {
      setEscapeError(result.error)
    }
  }

  const handleCopyPath = (path: string) => navigator.clipboard.writeText(path)
  const handleCopyValue = (value: unknown) =>
    navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value))

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 pt-2">
        <button
          onClick={() => setSubTab('editor')}
          className={`px-3 py-1 text-sm rounded-t ${subTab === 'editor' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
        >
          Editor
        </button>
        <button
          onClick={() => setSubTab('compare')}
          className={`px-3 py-1 text-sm rounded-t ${subTab === 'compare' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
        >
          Compare
        </button>
      </div>

      {subTab === 'compare' ? (
        <CompareView />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
            <button onClick={handleFormat} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Format</button>
            <button onClick={handleMinify} className="px-3 py-1 text-sm rounded bg-slate-200">Minify</button>
            <button onClick={handleAutoFix} className="px-3 py-1 text-sm rounded bg-amber-200">Auto-fix</button>
            <button onClick={handleEscape} className="px-3 py-1 text-sm rounded bg-slate-200">Escape</button>
            <button onClick={handleUnescape} className="px-3 py-1 text-sm rounded bg-slate-200">Unescape</button>
            <button
              onClick={() => setConvertFormat('yaml')}
              disabled={!parsed.ok}
              className="px-3 py-1 text-sm rounded bg-slate-200 disabled:opacity-50"
            >
              Convert to YAML
            </button>
            <button
              onClick={() => setConvertFormat('typescript')}
              disabled={!parsed.ok}
              className="px-3 py-1 text-sm rounded bg-slate-200 disabled:opacity-50"
            >
              Convert to TS
            </button>
            <button
              onClick={() => setShowJsonPath((v) => !v)}
              className={`px-3 py-1 text-sm rounded ${showJsonPath ? 'bg-slate-800 text-white' : 'bg-slate-200'}`}
            >
              JSONPath
            </button>
            <input
              placeholder="Search key/value…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto px-2 py-1 text-sm border border-slate-300 rounded"
            />
          </div>

          {escapeError && <div className="px-4 py-1 text-sm text-red-600">{escapeError}</div>}

          {showJsonPath && <JsonPathPanel value={parsed.ok ? parsed.value : null} />}

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
      )}

      {convertFormat && parsed.ok && (
        <ConvertModal value={parsed.value} format={convertFormat} onClose={() => setConvertFormat(null)} />
      )}
    </div>
  )
}
