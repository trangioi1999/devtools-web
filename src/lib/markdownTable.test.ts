import { describe, it, expect } from 'vitest'
import { aoaToMarkdownTable, parseMarkdownTables } from './markdownTable'

describe('aoaToMarkdownTable', () => {
  it('renders header, separator, and body rows', () => {
    const md = aoaToMarkdownTable([
      ['Name', 'Age'],
      ['An', 30],
      ['Bình', 25],
    ])
    expect(md).toBe('| Name | Age |\n| --- | --- |\n| An | 30 |\n| Bình | 25 |')
  })

  it('escapes pipes and converts newlines to <br>', () => {
    const md = aoaToMarkdownTable([
      ['Key', 'Value'],
      ['a|b', 'line1\nline2'],
    ])
    expect(md).toContain('a\\|b')
    expect(md).toContain('line1<br>line2')
  })

  it('pads ragged rows to the widest row', () => {
    const md = aoaToMarkdownTable([
      ['A', 'B', 'C'],
      ['1'],
    ])
    expect(md).toContain('| 1 |  |  |')
  })
})

describe('parseMarkdownTables', () => {
  it('extracts tables with their nearest heading as title', () => {
    const md = '## Users\n\n| Name | Age |\n| --- | --- |\n| An | 30 |\n\ntext\n\n## Orders\n\n| Id |\n| --- |\n| 1 |'
    const tables = parseMarkdownTables(md)
    expect(tables).toHaveLength(2)
    expect(tables[0].title).toBe('Users')
    expect(tables[0].rows).toEqual([
      ['Name', 'Age'],
      ['An', '30'],
    ])
    expect(tables[1].title).toBe('Orders')
  })

  it('unescapes pipes and <br> back to real characters', () => {
    const tables = parseMarkdownTables('| K |\n| --- |\n| a\\|b<br>c |')
    expect(tables[0].rows[1][0]).toBe('a|b\nc')
  })

  it('returns empty for documents without tables', () => {
    expect(parseMarkdownTables('# Just a heading\n\nsome text')).toEqual([])
  })
})
