import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type RectangleProps } from 'recharts'
import { computeChartData } from '../../lib/jsonChartData'
import { SubTabs } from '../../components/SubTabs'

type ChartKind = 'bar' | 'line'

const ACCENT = '#b68235'
const GRID = '#d7d3d3'
const AXIS_TEXT = '#7d7979'

function OutlinedBar(props: RectangleProps) {
  const { x, y, width, height } = props
  if (x === undefined || y === undefined || width === undefined || height === undefined) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={ACCENT} opacity={0.12} />
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={ACCENT} strokeWidth={1.5} />
    </g>
  )
}

export function ChartView({ value }: { value: unknown }) {
  const result = useMemo(() => computeChartData(value), [value])
  const [chartKind, setChartKind] = useState<ChartKind>('bar')
  const [xField, setXField] = useState<string | null>(null)
  const [yField, setYField] = useState<string | null>(null)

  useEffect(() => {
    if (!result.ok) return
    setXField((current) => (current && result.fields.some((f) => f.key === current) ? current : null))
    setYField((current) => (current && result.numericFields.includes(current) ? current : null))
  }, [result])

  if (!result.ok) {
    return <div className="p-4 text-sm text-muted">{result.reason}</div>
  }

  const x = xField ?? result.labelFields[0] ?? result.fields[0]?.key
  const y = yField ?? result.numericFields[0]

  const axisTickStyle = { fontFamily: 'var(--font-mono)', fontSize: 12, fill: AXIS_TEXT }

  return (
    <div className="h-full flex flex-col p-3 gap-3">
      <div className="flex items-center gap-3 text-[13px]">
        <label className="field flex items-center gap-2 m-0">
          X
          <select value={x} onChange={(e) => setXField(e.target.value)} className="input" style={{ minHeight: 30, width: 'auto', padding: '2px 8px' }}>
            {result.fields.map((f) => (
              <option key={f.key} value={f.key}>{f.key}</option>
            ))}
          </select>
        </label>
        <label className="field flex items-center gap-2 m-0">
          Y
          <select value={y} onChange={(e) => setYField(e.target.value)} className="input" style={{ minHeight: 30, width: 'auto', padding: '2px 8px' }}>
            {result.numericFields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <SubTabs
          tabs={[{ id: 'bar', label: 'Bar' }, { id: 'line', label: 'Line' }]}
          active={chartKind}
          onChange={setChartKind}
          compact
        />
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartKind === 'bar' ? (
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey={x} tick={axisTickStyle} stroke={GRID} />
              <YAxis tick={axisTickStyle} stroke={GRID} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey={y} shape={OutlinedBar} />
            </BarChart>
          ) : (
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
              <XAxis dataKey={x} tick={axisTickStyle} stroke={GRID} />
              <YAxis tick={axisTickStyle} stroke={GRID} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 4, fontSize: 12 }}
              />
              <Line dataKey={y} stroke={ACCENT} strokeWidth={1.5} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
