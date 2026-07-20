import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { spreadsheetToMarkdown, markdownToXlsxBlob, markdownToDocxBlob, markdownToHtml } from './docConvert'

function workbookBuffer(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('spreadsheetToMarkdown', () => {
  it('converts a single sheet to a bare markdown table', async () => {
    const md = await spreadsheetToMarkdown(workbookBuffer({ Sheet1: [['Name', 'Age'], ['An', 30]] }))
    expect(md).toContain('| Name | Age |')
    expect(md).toContain('| An | 30 |')
    expect(md).not.toContain('## Sheet1')
  })

  it('adds a heading per sheet for multi-sheet workbooks', async () => {
    const md = await spreadsheetToMarkdown(
      workbookBuffer({ Users: [['Name'], ['An']], Orders: [['Id'], [1]] }),
    )
    expect(md).toContain('## Users')
    expect(md).toContain('## Orders')
  })
})

describe('markdownToXlsxBlob', () => {
  it('round-trips markdown tables into named sheets', async () => {
    const blob = await markdownToXlsxBlob('## Users\n\n| Name |\n| --- |\n| An |')
    const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' })
    expect(wb.SheetNames).toEqual(['Users'])
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets.Users, { header: 1 })
    expect(rows).toEqual([['Name'], ['An']])
  })

  it('throws when there is no table to export', async () => {
    await expect(markdownToXlsxBlob('just text')).rejects.toThrow(/No markdown tables/)
  })
})

describe('markdownToDocxBlob', () => {
  it('produces a non-empty .docx blob from headings, lists, and tables', async () => {
    const blob = await markdownToDocxBlob('# Title\n\nSome **bold** text.\n\n- item 1\n- item 2\n\n| A |\n| --- |\n| 1 |')
    expect(blob.size).toBeGreaterThan(1000)
  })
})

describe('markdownToHtml', () => {
  it('renders GFM tables', async () => {
    const html = await markdownToHtml('| A |\n| --- |\n| 1 |')
    expect(html).toContain('<table>')
  })
})
