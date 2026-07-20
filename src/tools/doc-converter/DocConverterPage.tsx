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
  htmlTableToMarkdown,
  tsvToMarkdown,
} from '../../lib/docConvert'
import { formatMarkdownTables } from '../../lib/markdownTable'

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

  const appendMarkdown = (snippet: string) => {
    handleChange(md.trimEnd() ? `${md.trimEnd()}\n\n${snippet}\n` : `${snippet}\n`)
  }

  // Paste a table copied from Excel / Google Sheets (HTML or TSV clipboard).
  const handlePasteTable = () =>
    run('Reading clipboard…', async () => {
      try {
        for (const item of await navigator.clipboard.read()) {
          if (item.types.includes('text/html')) {
            const html = await (await item.getType('text/html')).text()
            const table = htmlTableToMarkdown(html)
            if (table) {
              appendMarkdown(table)
              return
            }
          }
        }
      } catch {
        // clipboard.read() may be unavailable/denied — fall back to plain text
      }
      const text = await navigator.clipboard.readText()
      const table = tsvToMarkdown(text)
      if (table) appendMarkdown(table)
      else if (text.trim()) appendMarkdown(text.trim())
      else throw new Error('Clipboard is empty — copy a table from Excel/Google Sheets first.')
    })

  const handleFormatTables = () => handleChange(formatMarkdownTables(md))

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
        <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
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
        <button type="button" className="btn btn-secondary" onClick={handlePasteTable} disabled={busy !== null}>
          Paste table
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleFormatTables} disabled={busy !== null} title="Re-align markdown table columns">
          Format tables
        </button>
        <span className="text-[12px] text-neutral-500">.docx · .xlsx · .csv · .md — or drop a file</span>

        {busy && (
          <span className="flex items-center gap-2 text-[12px] text-accent-700 fade-in">
            <span className="spinner" /> {busy}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={() =>
              run('Exporting…', async () => downloadBlob(new Blob([md], { type: 'text/markdown' }), `${baseName}.md`))
            }
          >
            ↓ .md
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={() => run('Exporting…', async () => downloadBlob(await markdownToXlsxBlob(md), `${baseName}.xlsx`))}
          >
            ↓ .xlsx
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={() => run('Exporting…', async () => downloadBlob(await markdownToDocxBlob(md), `${baseName}.docx`))}
          >
            ↓ .docx
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-1 text-sm text-delete fade-in">{error}</div>}

      <div className="flex-1 min-h-0 relative">
        {busy && busy.startsWith('Converting') && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-bg/70 backdrop-blur-[1px] fade-in">
            <span className="spinner spinner-lg" />
            <span className="text-sm text-neutral-700">{busy}</span>
          </div>
        )}
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
            <div key={html.length} className="flex-1 overflow-auto px-6 py-4 md-preview fade-in" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </SplitPane>
      </div>
    </div>
  )
}

export default DocConverterPage
