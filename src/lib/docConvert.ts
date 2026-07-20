import { aoaToMarkdownTable, parseMarkdownTables } from './markdownTable'

// Every converter lazy-imports its heavy library (SheetJS, mammoth, docx,
// marked) so the Doc Converter tab costs nothing until it is actually used.

/** .xlsx / .xls / .csv buffer -> markdown: one `## Sheet` section per sheet. */
export async function spreadsheetToMarkdown(buf: ArrayBuffer): Promise<string> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array' })
  const sections: string[] = []
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    const trimmed = rows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    if (trimmed.length === 0) continue
    const table = aoaToMarkdownTable(trimmed)
    sections.push(wb.SheetNames.length > 1 ? `## ${name}\n\n${table}` : table)
  }
  return sections.join('\n\n') || '_(empty spreadsheet)_'
}

/** .docx buffer -> markdown via mammoth (docx -> HTML) + turndown (+ GFM tables). */
export async function docxToMarkdown(buf: ArrayBuffer): Promise<string> {
  const [mammoth, TurndownService, { gfm }] = await Promise.all([
    import('mammoth'),
    import('turndown').then((m) => m.default),
    import('turndown-plugin-gfm') as Promise<{ gfm: unknown }>,
  ])
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf })
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  turndown.use(gfm as Parameters<typeof turndown.use>[0])
  return turndown.turndown(html)
}

/** '123' / '-4.5' -> number, everything else stays a string. */
function coerceCell(value: string): string | number {
  return /^-?\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : value
}

/**
 * Markdown tables -> one workbook, a sheet per table (named by nearest
 * heading). Written with xlsx-js-style so the header row is bold on a gray
 * fill with thin borders, and column widths fit their content.
 */
export async function markdownToXlsxBlob(md: string): Promise<Blob> {
  const XLSX = (await import('xlsx-js-style')) as typeof import('xlsx')
  const tables = parseMarkdownTables(md)
  if (tables.length === 0) throw new Error('No markdown tables found — nothing to export to Excel.')

  const thin = { style: 'thin', color: { rgb: 'C9C5C5' } }
  const border = { top: thin, bottom: thin, left: thin, right: thin }

  const wb = XLSX.utils.book_new()
  const usedNames = new Set<string>()
  tables.forEach((t, idx) => {
    let name = (t.title ?? `Sheet${idx + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || `Sheet${idx + 1}`
    let counter = 2
    const base = name
    while (usedNames.has(name)) name = `${base.slice(0, 28)}_${counter++}`
    usedNames.add(name)

    const aoa = t.rows.map((row, r) => (r === 0 ? row : row.map(coerceCell)))
    const sheet = XLSX.utils.aoa_to_sheet(aoa)

    const colCount = Math.max(...t.rows.map((r) => r.length))
    for (let r = 0; r < t.rows.length; r++) {
      for (let c = 0; c < colCount; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        const cell = (sheet as Record<string, unknown>)[ref] as { s?: unknown } | undefined
        if (!cell) continue
        cell.s =
          r === 0
            ? { font: { bold: true }, fill: { fgColor: { rgb: 'EFECEC' } }, border }
            : { border }
      }
    }
    sheet['!cols'] = Array.from({ length: colCount }, (_, c) => ({
      wch: Math.min(60, Math.max(10, ...t.rows.map((row) => String(row[c] ?? '').length + 2))),
    }))

    XLSX.utils.book_append_sheet(wb, sheet, name)
  })

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** HTML containing <table> (e.g. clipboard from Excel/Sheets) -> markdown table. */
export function htmlTableToMarkdown(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = [...doc.querySelectorAll('table')]
  if (tables.length === 0) return null
  return tables
    .map((table) => {
      const rows = [...table.querySelectorAll('tr')].map((tr) =>
        [...tr.querySelectorAll('th,td')].map((cell) => (cell.textContent ?? '').trim()),
      )
      return aoaToMarkdownTable(rows.filter((r) => r.length > 0))
    })
    .join('\n\n')
}

/** Tab-separated clipboard text (Excel copy) -> markdown table; null if not TSV. */
export function tsvToMarkdown(text: string): string | null {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2 || !lines[0].includes('\t')) return null
  return aoaToMarkdownTable(lines.map((l) => l.split('\t')))
}

interface InlineToken {
  type: string
  text?: string
  raw: string
  tokens?: InlineToken[]
}

/** Markdown -> .docx via marked's lexer and the docx builder. */
export async function markdownToDocxBlob(md: string): Promise<Blob> {
  const [{ lexer }, docx] = await Promise.all([import('marked'), import('docx')])
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = docx

  const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'C9C5C5' }
  const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER }

  const HEADINGS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ]

  function inlineRuns(tokens: InlineToken[] | undefined, style: { bold?: boolean; italics?: boolean } = {}): InstanceType<typeof TextRun>[] {
    if (!tokens) return []
    const runs: InstanceType<typeof TextRun>[] = []
    for (const t of tokens) {
      if (t.type === 'strong') runs.push(...inlineRuns(t.tokens, { ...style, bold: true }))
      else if (t.type === 'em') runs.push(...inlineRuns(t.tokens, { ...style, italics: true }))
      else if (t.type === 'codespan') runs.push(new TextRun({ text: t.text ?? '', font: 'JetBrains Mono', ...style }))
      else if (t.type === 'br') runs.push(new TextRun({ text: '', break: 1 }))
      else if (t.tokens && t.tokens.length > 0) runs.push(...inlineRuns(t.tokens, style))
      else runs.push(new TextRun({ text: t.text ?? t.raw ?? '', ...style }))
    }
    return runs
  }

  type DocChild = InstanceType<typeof Paragraph> | InstanceType<typeof Table>
  const children: DocChild[] = []

  for (const token of lexer(md)) {
    const t = token as unknown as {
      type: string
      depth?: number
      text?: string
      tokens?: InlineToken[]
      items?: { tokens?: { tokens?: InlineToken[]; text?: string }[] }[]
      ordered?: boolean
      header?: { tokens?: InlineToken[]; text?: string }[]
      rows?: { tokens?: InlineToken[]; text?: string }[][]
    }

    if (t.type === 'heading') {
      children.push(new Paragraph({ heading: HEADINGS[(t.depth ?? 1) - 1], children: inlineRuns(t.tokens) }))
    } else if (t.type === 'paragraph') {
      children.push(new Paragraph({ children: inlineRuns(t.tokens) }))
    } else if (t.type === 'code') {
      for (const line of (t.text ?? '').split('\n')) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line || ' ', font: 'JetBrains Mono', size: 18 })],
            shading: { type: ShadingType.CLEAR, fill: 'F4F2F2' },
            spacing: { before: 0, after: 0 },
          }),
        )
      }
    } else if (t.type === 'list') {
      for (const item of t.items ?? []) {
        const first = item.tokens?.[0]
        children.push(
          new Paragraph({
            children: inlineRuns((first?.tokens as InlineToken[]) ?? [{ type: 'text', text: first?.text ?? '', raw: first?.text ?? '' }]),
            bullet: { level: 0 },
          }),
        )
      }
    } else if (t.type === 'table') {
      const makeRow = (cells: { tokens?: InlineToken[]; text?: string }[], isHeader: boolean) =>
        new TableRow({
          tableHeader: isHeader,
          children: cells.map(
            (c) =>
              new TableCell({
                borders: CELL_BORDERS,
                shading: isHeader ? { type: ShadingType.CLEAR, fill: 'EFECEC' } : undefined,
                margins: { top: 60, bottom: 60, left: 110, right: 110 },
                children: [new Paragraph({ children: inlineRuns(c.tokens, isHeader ? { bold: true } : {}), spacing: { before: 0, after: 0 } })],
              }),
          ),
        })
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [makeRow(t.header ?? [], true), ...(t.rows ?? []).map((r) => makeRow(r, false))],
        }),
      )
    } else if (t.type === 'space') {
      // skip
    } else if (t.text) {
      children.push(new Paragraph({ children: [new TextRun({ text: t.text })] }))
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 }, paragraph: { spacing: { after: 120, line: 300 } } },
        heading1: { run: { font: 'Calibri', size: 36, bold: true, color: '1F1E1C' }, paragraph: { spacing: { before: 280, after: 160 } } },
        heading2: { run: { font: 'Calibri', size: 30, bold: true, color: '1F1E1C' }, paragraph: { spacing: { before: 240, after: 140 } } },
        heading3: { run: { font: 'Calibri', size: 26, bold: true, color: '3A3835' }, paragraph: { spacing: { before: 200, after: 120 } } },
        heading4: { run: { font: 'Calibri', size: 24, bold: true, color: '3A3835' }, paragraph: { spacing: { before: 180, after: 100 } } },
      },
    },
    sections: [{ children }],
  })
  return Packer.toBlob(doc)
}

/** Markdown -> HTML string for the live preview pane. */
export async function markdownToHtml(md: string): Promise<string> {
  const { parse } = await import('marked')
  return parse(md, { async: false, gfm: true, breaks: false }) as string
}
