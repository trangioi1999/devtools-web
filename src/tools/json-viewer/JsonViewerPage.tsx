import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Network, Table2, Type, BarChart3 } from 'lucide-react'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { escapeJsonString, unescapeJsonString } from '../../lib/jsonEscape'
import { countJsonMatches } from '../../lib/jsonSearch'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'
import { CompareView } from './CompareView'
import { ConvertModal } from './ConvertModal'
import { JsonPathPanel } from './JsonPathPanel'
import { GraphView } from './GraphView'
import { TableView } from './TableView'
import { TextView } from './TextView'
import { ChartView } from './ChartView'
import { IconToolbar } from './IconToolbar'
import { Toast } from './Toast'
import { useToast } from './useToast'

type SubTab = 'editor' | 'compare'
type ViewMode = 'tree' | 'table' | 'text' | 'chart'

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Network }[] = [
  { mode: 'tree', label: 'Tree', icon: Network },
  { mode: 'table', label: 'Table', icon: Table2 },
  { mode: 'text', label: 'Text', icon: Type },
  { mode: 'chart', label: 'Chart', icon: BarChart3 },
]

export function JsonViewerPage() {
  const [subTab, setSubTab] = useState<SubTab>('editor')
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [text, setText] = useState(() => loadJsonViewerContent())
  const [search, setSearch] = useState('')
  const [editorRef, setEditorRef] = useState<Parameters<OnMount>[0] | null>(null)
  const [monacoRef, setMonacoRef] = useState<Parameters<OnMount>[1] | null>(null)
  const [convertFormat, setConvertFormat] = useState<'yaml' | 'typescript' | null>(null)
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [escapeError, setEscapeError] = useState<string | null>(null)
  const { toasts, showToast } = useToast()

  const parsed = useMemo(() => parseJsonStrict(text), [text])
  const matchCount = useMemo(() => (parsed.ok ? countJsonMatches(parsed.value, search) : 0), [parsed, search])

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

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path)
    showToast(`Copied path: ${path}`)
  }

  const handleCopyValue = (value: unknown) => {
    navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value))
    showToast('Copied value')
  }

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
          <IconToolbar
            onFormat={handleFormat}
            onMinify={handleMinify}
            onAutoFix={handleAutoFix}
            onEscape={handleEscape}
            onUnescape={handleUnescape}
            onConvertYaml={() => setConvertFormat('yaml')}
            onConvertTypeScript={() => setConvertFormat('typescript')}
            onToggleJsonPath={() => setShowJsonPath((v) => !v)}
            jsonPathActive={showJsonPath}
            convertDisabled={!parsed.ok}
          />

          {escapeError && <div className="px-4 py-1 text-sm text-red-600">{escapeError}</div>}

          {showJsonPath && <JsonPathPanel value={parsed.ok ? parsed.value : null} />}

          <div className="flex-1 grid grid-cols-2 grid-rows-1 min-h-0">
            <Editor
              language="json"
              value={text}
              onMount={handleMount}
              onChange={handleChange}
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
            <div className="flex flex-col min-h-0 border-l border-slate-200">
              <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5">
                {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => setViewMode(mode)}
                    className={`p-1.5 rounded ${
                      viewMode === mode ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                ))}
                <input
                  placeholder="Search JSON…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ml-auto px-2 py-1 text-sm border border-slate-300 rounded w-48"
                />
                {search && <span className="text-xs text-slate-500 whitespace-nowrap">{matchCount} matches</span>}
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {!parsed.ok ? (
                  <div className="p-3 text-sm text-red-600">
                    {parsed.errors.map((e, i) => (
                      <div key={i}>Line {e.line}, col {e.column}: {e.message}</div>
                    ))}
                  </div>
                ) : viewMode === 'tree' ? (
                  <GraphView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} />
                ) : viewMode === 'table' ? (
                  <TableView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} />
                ) : viewMode === 'text' ? (
                  <TextView value={parsed.value} />
                ) : (
                  <ChartView value={parsed.value} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {convertFormat && parsed.ok && (
        <ConvertModal
          value={parsed.value}
          format={convertFormat}
          onClose={() => setConvertFormat(null)}
          onCopied={() => showToast('Copied converted output')}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
