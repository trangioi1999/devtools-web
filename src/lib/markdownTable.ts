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
