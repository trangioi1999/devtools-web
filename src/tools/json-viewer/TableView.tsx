import { computeTableShape, type TableCellValue } from '../../lib/jsonTableRows'

interface CellProps {
  cell: TableCellValue
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
}

function Cell({ cell, onCopyPath, onCopyValue }: CellProps) {
  if (cell.kind === 'primitive') {
    return (
      <button
        type="button"
        onClick={() => onCopyValue(cell.value)}
        className="font-mono text-xs text-emerald-700 hover:underline text-left"
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
            <td className="pr-2 text-slate-500 font-mono align-top whitespace-nowrap">
              <button type="button" onClick={() => onCopyPath(row.path)} className="hover:underline">
                {row.key}
              </button>
            </td>
            <td className="font-mono align-top">
              <Cell cell={row.cell} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
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
}

export function TableView({ value, onCopyPath, onCopyValue }: TableViewProps) {
  const shape = computeTableShape(value)

  if (shape.kind === 'object-array') {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {shape.columns.map((col) => (
                <th key={col.key} className="text-left border-b border-slate-300 px-2 py-1 sticky top-0 bg-white">
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shape.rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 align-top">
                {shape.columns.map((col) => (
                  <td key={col.key} className="px-2 py-1">
                    <Cell cell={row.cells[col.key]} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
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
      <table className="w-full text-sm border-collapse">
        <tbody>
          {shape.rows.map((row) => (
            <tr key={row.key} className="border-b border-slate-100 align-top">
              <td className="px-2 py-1 text-slate-500 font-mono whitespace-nowrap">
                <button type="button" onClick={() => onCopyPath(row.path)} className="hover:underline">
                  {row.key}
                </button>
              </td>
              <td className="px-2 py-1">
                <Cell cell={row.cell} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
