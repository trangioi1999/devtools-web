import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { escapeJsonString, unescapeJsonString } from '../../lib/jsonEscape'
import { countJsonMatches } from '../../lib/jsonSearch'
import { defineClassicalTheme, CLASSICAL_THEME } from '../../lib/monacoTheme'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'
import { SplitPane } from '../../components/SplitPane'
import { SubTabs } from '../../components/SubTabs'
import { CompareView } from './CompareView'
import { ConvertModal } from './ConvertModal'
import { JsonPathPanel } from './JsonPathPanel'
import { TreeView } from './TreeView'
import { GraphView } from './GraphView'
import { TableView } from './TableView'
import { TextView } from './TextView'
import { ChartView } from './ChartView'
import { IconToolbar } from './IconToolbar'
import { Toast } from './Toast'
import { useToast } from './useToast'

type SubTab = 'editor' | 'compare'
type ViewMode = 'tree' | 'graph' | 'text' | 'table' | 'chart'

function rootCountLabel(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'} at root`
  if (value !== null && typeof value === 'object') {
    const n = Object.keys(value).length
    return `${n} key${n === 1 ? '' : 's'} at root`
  }
  return '1 value at root'
}

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
  const lineCount = useMemo(() => text.split('\n').length, [text])

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setText(next)
    saveJsonViewerContent(next)
    setEscapeError(null)
  }

  const handleMount: OnMount = (editor, monacoInstance) => {
    defineClassicalTheme(monacoInstance)
    monacoInstance.editor.setTheme(CLASSICAL_THEME)
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
      <div className="flex items-center gap-4 border-b border-divider px-4 py-2 flex-wrap">
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
        <SubTabs
          tabs={[
            { id: 'editor', label: 'Editor' },
            { id: 'compare', label: 'Compare' },
          ]}
          active={subTab}
          onChange={setSubTab}
          className="ml-auto"
        />
      </div>

      {subTab === 'compare' ? (
        <CompareView />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {escapeError && <div className="px-4 py-1 text-sm text-delete">{escapeError}</div>}

          {showJsonPath && <JsonPathPanel value={parsed.ok ? parsed.value : null} />}

          <div className="flex-1 min-h-0">
            <SplitPane direction="horizontal" storageKey="devtools:json-viewer:editor-split">
              <div className="h-full flex flex-col min-h-0">
                <div className="flex items-baseline gap-2 px-3 py-2 border-b border-divider">
                  <h6 className="text-neutral-600">Source</h6>
                  <span className="text-[11px] text-accent-700 font-mono tnum">
                    {lineCount} lines · {parsed.ok ? 'valid' : `${parsed.errors.length} error${parsed.errors.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <Editor
                    language="json"
                    value={text}
                    theme={CLASSICAL_THEME}
                    onMount={handleMount}
                    onChange={handleChange}
                    options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
              </div>
              <div className="h-full flex flex-col min-h-0">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-divider">
                  <SubTabs
                    tabs={[
                      { id: 'tree', label: 'Tree' },
                      { id: 'graph', label: 'Graph' },
                      { id: 'text', label: 'Text' },
                      { id: 'table', label: 'Table' },
                      { id: 'chart', label: 'Chart' },
                    ]}
                    active={viewMode}
                    onChange={setViewMode}
                    compact
                  />
                  {viewMode !== 'chart' && (
                    <div className="ml-auto flex items-center gap-2">
                      <input
                        placeholder="Search keys & values…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                        style={{ maxWidth: 220, minHeight: 32 }}
                      />
                      {search && <span className="text-xs text-muted whitespace-nowrap">{matchCount} matches</span>}
                    </div>
                  )}
                </div>
                <div className={`flex-1 min-h-0 ${viewMode === 'graph' ? 'overflow-hidden' : 'overflow-auto px-4 py-3'}`}>
                  {!parsed.ok ? (
                    <div className="text-sm text-delete">
                      {parsed.errors.map((e, i) => (
                        <div key={i}>Line {e.line}, col {e.column}: {e.message}</div>
                      ))}
                    </div>
                  ) : viewMode === 'tree' ? (
                    <TreeView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} search={search} />
                  ) : viewMode === 'graph' ? (
                    <GraphView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} search={search} />
                  ) : viewMode === 'table' ? (
                    <TableView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} search={search} />
                  ) : viewMode === 'text' ? (
                    <TextView value={parsed.value} />
                  ) : (
                    <ChartView value={parsed.value} />
                  )}
                </div>
                <div className="flex gap-3 px-3 py-1 border-t border-divider text-[11px] text-neutral-600">
                  <span className="uppercase tracking-[0.08em]">
                    {parsed.ok ? rootCountLabel(parsed.value) : 'invalid json'}
                  </span>
                  <span className="ml-auto uppercase tracking-[0.08em] text-accent-700">Click a key to copy its path</span>
                </div>
              </div>
            </SplitPane>
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
