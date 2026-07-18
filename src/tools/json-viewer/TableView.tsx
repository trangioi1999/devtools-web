import { computeTableShape, type TableCellValue } from '../../lib/jsonTableRows'
import { matchesText } from '../../lib/jsonSearch'
import { valueClassName } from '../../lib/jsonValueStyle'

interface CellProps {
  cell: TableCellValue
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  search: string
}

function Cell({ cell, onCopyPath, onCopyValue, search }: CellProps) {
  if (cell.kind === 'primitive') {
    if (cell.value === undefined) {
      return <span className="text-neutral-400">—</span>
    }
    return (
      <button
        type="button"
        onClick={() => onCopyValue(cell.value)}
        className={`font-mono text-xs hover:underline text-left ${valueClassName(cell.value)} ${
          matchesText(JSON.stringify(cell.value), search) ? 'mark' : ''
        }`}
      >
        {JSON.stringify(cell.value)}
      </button>
    )
  }

  return (
    <table className="w-full text-xs">
      <tbody>
        {cell.rows.map((row) => (
          <tr key={row.key}>
            <td className="pr-2 text-neutral-600 font-mono align-top whitespace-nowrap">
              <button
                type="button"
                onClick={() => onCopyPath(row.path)}
                className={`hover:underline ${matchesText(row.key, search) ? 'mark' : ''}`}
              >
                {row.key}
              </button>
            </td>
            <td className="font-mono align-top">
              <Cell cell={row.cell} onCopyPath={onCopyPath} onCopyValue={onCopyValue} search={search} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface TableViewProps {
  value: unknown
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  search: string
}

export function TableView({ value, onCopyPath, onCopyValue, search }: TableViewProps) {
  const shape = computeTableShape(value)

  if (shape.kind === 'object-array') {
    return (
      <div className="overflow-auto h-full">
        <table className="table">
          <thead>
            <tr>
              {shape.columns.map((col) => (
                <th key={col.key} className="sticky top-0 bg-bg">
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shape.rows.map((row) => (
              <tr key={row.id}>
                {shape.columns.map((col) => (
                  <td key={col.key}>
                    <Cell cell={row.cells[col.key]} onCopyPath={onCopyPath} onCopyValue={onCopyValue} search={search} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full">
      <table className="table">
        <tbody>
          {shape.rows.map((row) => (
            <tr key={row.key}>
              <td className="text-neutral-600 font-mono whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onCopyPath(row.path)}
                  className={`hover:underline ${matchesText(row.key, search) ? 'mark' : ''}`}
                >
                  {row.key}
                </button>
              </td>
              <td>
                <Cell cell={row.cell} onCopyPath={onCopyPath} onCopyValue={onCopyValue} search={search} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
