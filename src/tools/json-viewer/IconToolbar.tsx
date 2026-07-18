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
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center gap-1">
        <button type="button" className="btn btn-ghost" onClick={onFormat}>Format</button>
        <button type="button" className="btn btn-ghost" onClick={onMinify}>Minify</button>
        <button type="button" className="btn btn-ghost" onClick={onAutoFix}>Auto-fix</button>
      </div>
      <div className="w-px h-[18px] bg-divider" />
      <div className="flex items-center gap-1">
        <button type="button" className="btn btn-ghost" onClick={onEscape}>Escape</button>
        <button type="button" className="btn btn-ghost" onClick={onUnescape}>Unescape</button>
      </div>
      <div className="w-px h-[18px] bg-divider" />
      <div className="flex items-center gap-1">
        <button type="button" className="btn btn-ghost" onClick={onConvertYaml} disabled={convertDisabled}>To YAML</button>
        <button type="button" className="btn btn-ghost" onClick={onConvertTypeScript} disabled={convertDisabled}>To TypeScript</button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onToggleJsonPath}
          aria-pressed={jsonPathActive}
          style={jsonPathActive ? { background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)' } : undefined}
        >
          JSONPath
        </button>
      </div>
    </div>
  )
}
