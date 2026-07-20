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

/** Markdown tables -> one workbook, a sheet per table (named by nearest heading). */
export async function markdownToXlsxBlob(md: string): Promise<Blob> {
  const XLSX = await import('xlsx')
  const tables = parseMarkdownTables(md)
  if (tables.length === 0) throw new Error('No markdown tables found — nothing to export to Excel.')

  const wb = XLSX.utils.book_new()
  const usedNames = new Set<string>()
  tables.forEach((t, idx) => {
    let name = (t.title ?? `Sheet${idx + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || `Sheet${idx + 1}`
    let counter = 2
    const base = name
    while (usedNames.has(name)) name = `${base.slice(0, 28)}_${counter++}`
    usedNames.add(name)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t.rows), name)
  })

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = docx

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
        children.push(new Paragraph({ children: [new TextRun({ text: line, font: 'JetBrains Mono', size: 18 })] }))
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
          children: cells.map(
            (c) =>
              new TableCell({
                children: [new Paragraph({ children: inlineRuns(c.tokens, isHeader ? { bold: true } : {}) })],
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

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}

/** Markdown -> HTML string for the live preview pane. */
export async function markdownToHtml(md: string): Promise<string> {
  const { parse } = await import('marked')
  return parse(md, { async: false, gfm: true, breaks: false }) as string
}
