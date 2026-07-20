import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { SplitPane } from '../../components/SplitPane'
import { CLASSICAL_THEME, defineClassicalTheme } from '../../lib/monacoTheme'
import {
  spreadsheetToMarkdown,
  docxToMarkdown,
  markdownToXlsxBlob,
  markdownToDocxBlob,
  markdownToHtml,
} from '../../lib/docConvert'

const MD_KEY = 'devtools:doc-converter:markdown'

const DEFAULT_MD = `# Doc Converter

Upload a **Word** (.docx), **Excel** (.xlsx/.xls) or **CSV** file to convert it to markdown —
or write markdown here and export it back to Word/Excel.

## Example table

| Feature | Status |
| --- | --- |
| Excel → Markdown | ready |
| Word → Markdown | ready |
| Markdown → Word/Excel | ready |
`

const EDITOR_OPTIONS = { minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', wordWrap: 'on' as const }

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function DocConverterPage() {
  const [md, setMd] = useState(() => localStorage.getItem(MD_KEY) ?? DEFAULT_MD)
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setMd(next)
    localStorage.setItem(MD_KEY, next)
  }

  // Live preview — debounce so typing stays smooth.
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const rendered = await markdownToHtml(md)
        if (!cancelled) setHtml(rendered)
      } catch {
        /* preview is best-effort */
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [md])

  const run = async (label: string, fn: () => Promise<void>) => {
    setError(null)
    setBusy(label)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const name = file.name.toLowerCase()
    await run(`Converting ${file.name}…`, async () => {
      let result: string
      if (name.endsWith('.docx')) {
        result = await docxToMarkdown(await file.arrayBuffer())
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        result = await spreadsheetToMarkdown(await file.arrayBuffer())
      } else if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) {
        result = await file.text()
      } else {
        throw new Error(`Unsupported file type: ${file.name}. Use .docx, .xlsx, .xls, .csv or .md.`)
      }
      handleChange(result)
      setSourceName(file.name)
    })
  }

  const baseName = useMemo(() => (sourceName ? sourceName.replace(/\.[^.]+$/, '') : 'document'), [sourceName])

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center gap-2 border-b border-divider px-4 py-2 flex-wrap"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          Upload file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.xlsx,.xls,.csv,.md,.markdown,.txt"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <span className="text-[12px] text-neutral-500">.docx · .xlsx · .csv · .md — or drop a file anywhere on this bar</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              run('Exporting…', async () => downloadBlob(new Blob([md], { type: 'text/markdown' }), `${baseName}.md`))
            }
          >
            ↓ .md
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => run('Exporting…', async () => downloadBlob(await markdownToXlsxBlob(md), `${baseName}.xlsx`))}
          >
            ↓ .xlsx
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => run('Exporting…', async () => downloadBlob(await markdownToDocxBlob(md), `${baseName}.docx`))}
          >
            ↓ .docx
          </button>
        </div>
      </div>

      {(error || busy) && (
        <div className={`px-4 py-1 text-sm ${error ? 'text-delete' : 'text-neutral-600'}`}>{error ?? busy}</div>
      )}

      <div className="flex-1 min-h-0">
        <SplitPane direction="horizontal" storageKey="devtools:doc-converter:split">
          <div className="h-full flex flex-col min-h-0">
            <div className="flex items-baseline gap-2 px-3 py-2 border-b border-divider">
              <h6 className="m-0 text-neutral-600">Markdown</h6>
              {sourceName && <span className="text-[11px] text-accent-700 font-mono">from {sourceName}</span>}
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                language="markdown"
                value={md}
                onChange={handleChange}
                theme={CLASSICAL_THEME}
                beforeMount={defineClassicalTheme}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>
          <div className="h-full flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-divider">
              <h6 className="m-0 text-neutral-600">Preview</h6>
            </div>
            {/* Rendered from the user's own markdown, local-only */}
            <div className="flex-1 overflow-auto px-6 py-4 md-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </SplitPane>
      </div>
    </div>
  )
}

export default DocConverterPage
