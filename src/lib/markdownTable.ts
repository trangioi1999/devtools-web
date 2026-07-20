/** Escape a cell for a markdown table: pipes and newlines break the grid. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

/** Rows (first row = header) -> GitHub-flavored markdown table. */
export function aoaToMarkdownTable(rows: unknown[][]): string {
  if (rows.length === 0) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const norm = rows.map((r) => Array.from({ length: width }, (_, i) => escapeCell(r[i])))
  const [header, ...body] = norm
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ]
  return lines.join('\n')
}

function splitRow(line: string): string[] {
  // strip leading/trailing pipe, split on unescaped pipes
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return inner
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n'))
}

function isSeparatorRow(line: string): boolean {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return inner.split('|').every((c) => /^\s*:?-{3,}:?\s*$/.test(c)) && inner.includes('-')
}

export interface MarkdownTable {
  /** Nearest heading above the table, if any — used as the sheet name. */
  title: string | null
  rows: string[][]
}

/** Extract every markdown table (header + body rows) from a document. */
export function parseMarkdownTables(md: string): MarkdownTable[] {
  const lines = md.split('\n')
  const tables: MarkdownTable[] = []
  let lastHeading: string | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      lastHeading = headingMatch[1].trim()
      i += 1
      continue
    }

    const looksLikeRow = /^\s*\|.*\|\s*$/.test(line)
    if (looksLikeRow && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const rows: string[][] = [splitRow(line)]
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]))
        i += 1
      }
      tables.push({ title: lastHeading, rows })
      continue
    }
    i += 1
  }

  return tables
}

/** Display width where CJK/emoji count as 2 columns — keeps padding aligned. */
function displayWidth(text: string): number {
  let w = 0
  for (const ch of text) {
    w += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 2 : 1
  }
  return w
}

function padCell(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)))
}

/**
 * Re-align every markdown table in the document so columns line up when
 * reading the raw source. Non-table lines are left untouched.
 */
export function formatMarkdownTables(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const looksLikeRow = /^\s*\|.*\|\s*$/.test(line)
    if (looksLikeRow && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const rows: string[][] = [splitRawRow(line)]
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRawRow(lines[i]))
        i += 1
      }
      const width = Math.max(...rows.map((r) => r.length))
      const norm = rows.map((r) => Array.from({ length: width }, (_, c) => r[c] ?? ''))
      const colWidths = Array.from({ length: width }, (_, c) =>
        Math.max(3, ...norm.map((r) => displayWidth(r[c]))),
      )
      const render = (r: string[]) => `| ${r.map((cell, c) => padCell(cell, colWidths[c])).join(' | ')} |`
      out.push(render(norm[0]))
      out.push(`| ${colWidths.map((w) => '-'.repeat(w)).join(' | ')} |`)
      for (const r of norm.slice(1)) out.push(render(r))
      continue
    }
    out.push(line)
    i += 1
  }

  return out.join('\n')
}

/** Split a table row keeping escaped pipes escaped (for re-rendering as-is). */
function splitRawRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return inner.split(/(?<!\\)\|/).map((c) => c.trim())
}

