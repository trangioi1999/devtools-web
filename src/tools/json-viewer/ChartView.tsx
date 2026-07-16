import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeChartData } from '../../lib/jsonChartData'

type ChartKind = 'bar' | 'line'

export function ChartView({ value }: { value: unknown }) {
  const result = useMemo(() => computeChartData(value), [value])
  const [chartKind, setChartKind] = useState<ChartKind>('bar')
  const [xField, setXField] = useState<string | null>(null)
  const [yField, setYField] = useState<string | null>(null)

  if (!result.ok) {
    return <div className="p-4 text-sm text-slate-500">{result.reason}</div>
  }

  const x = xField ?? result.labelFields[0] ?? result.fields[0]?.key
  const y = yField ?? result.numericFields[0]

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          X:
          <select value={x} onChange={(e) => setXField(e.target.value)} className="border border-slate-300 rounded px-1 py-0.5">
            {result.fields.map((f) => (
              <option key={f.key} value={f.key}>{f.key}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Y:
          <select value={y} onChange={(e) => setYField(e.target.value)} className="border border-slate-300 rounded px-1 py-0.5">
            {result.numericFields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Type:
          <select
            value={chartKind}
            onChange={(e) => setChartKind(e.target.value as ChartKind)}
            className="border border-slate-300 rounded px-1 py-0.5"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
          </select>
        </label>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartKind === 'bar' ? (
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={y} fill="#4f46e5" />
            </BarChart>
          ) : (
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x} />
              <YAxis />
              <Tooltip />
              <Line dataKey={y} stroke="#4f46e5" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
