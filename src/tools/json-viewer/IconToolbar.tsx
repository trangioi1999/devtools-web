import { useState, type ReactNode } from 'react'
import { AlignLeft, Minimize2, Wrench, Quote, Eraser, FileCode2, ChevronDown, Route } from 'lucide-react'

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
    </button>
  )
}

interface IconToolbarProps {
  onFormat: () => void
  onMinify: () => void
  onAutoFix: () => void
  onEscape: () => void
  onUnescape: () => void
  onConvertYaml: () => void
  onConvertTypeScript: () => void
  onToggleJsonPath: () => void
  jsonPathActive: boolean
  convertDisabled: boolean
}

export function IconToolbar({
  onFormat,
  onMinify,
  onAutoFix,
  onEscape,
  onUnescape,
  onConvertYaml,
  onConvertTypeScript,
  onToggleJsonPath,
  jsonPathActive,
  convertDisabled,
}: IconToolbarProps) {
  const [convertOpen, setConvertOpen] = useState(false)

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-4 py-2">
      <ToolbarButton icon={<AlignLeft size={16} />} label="Format" onClick={onFormat} />
      <ToolbarButton icon={<Minimize2 size={16} />} label="Minify" onClick={onMinify} />
      <ToolbarButton icon={<Wrench size={16} />} label="Auto-fix" onClick={onAutoFix} />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton icon={<Quote size={16} />} label="Escape" onClick={onEscape} />
      <ToolbarButton icon={<Eraser size={16} />} label="Unescape" onClick={onUnescape} />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <div className="relative">
        <ToolbarButton
          icon={
            <span className="flex items-center gap-0.5">
              <FileCode2 size={16} />
              <ChevronDown size={12} />
            </span>
          }
          label="Convert"
          onClick={() => setConvertOpen((v) => !v)}
          disabled={convertDisabled}
        />
        {convertOpen && !convertDisabled && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 min-w-[8rem]">
            <button
              type="button"
              onClick={() => {
                onConvertYaml()
                setConvertOpen(false)
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              To YAML
            </button>
            <button
              type="button"
              onClick={() => {
                onConvertTypeScript()
                setConvertOpen(false)
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              To TypeScript
            </button>
          </div>
        )}
      </div>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton icon={<Route size={16} />} label="JSONPath" onClick={onToggleJsonPath} active={jsonPathActive} />
    </div>
  )
}
