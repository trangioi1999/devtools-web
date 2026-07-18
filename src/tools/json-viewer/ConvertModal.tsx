import { useMemo, useState } from 'react'
import { toYaml, toTypeScriptInterface } from '../../lib/jsonConvert'

interface ConvertModalProps {
  value: unknown
  format: 'yaml' | 'typescript'
  onClose: () => void
  onCopied: () => void
}

export function ConvertModal({ value, format, onClose, onCopied }: ConvertModalProps) {
  const [rootName, setRootName] = useState('Root')
  const [usePrefix, setUsePrefix] = useState(true)
  const [useBeSuffix, setUseBeSuffix] = useState(false)

  const { output, error } = useMemo(() => {
    try {
      const out =
        format === 'yaml'
          ? toYaml(value)
          : toTypeScriptInterface(value, {
              rootName: rootName.trim() || 'Root',
              prefix: usePrefix ? 'I' : '',
              suffix: useBeSuffix ? 'BE' : '',
            })
      return { output: out, error: null as string | null }
    } catch (err) {
      return { output: '', error: (err as Error).message }
    }
  }, [value, format, rootName, usePrefix, useBeSuffix])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    onCopied()
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog dialog-wide">
        <h2 className="dialog-title">{format === 'yaml' ? 'YAML' : 'TypeScript interface'}</h2>
        {format === 'typescript' && (
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <label className="field flex items-center gap-2 m-0">
              <span className="m-0">Root name</span>
              <input
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                placeholder="Root"
                className="input font-mono text-xs"
                style={{ width: 160 }}
              />
            </label>
            <label className="radio" title='Prefix every interface with "I" (IRoot, IEnvironment)'>
              <input type="checkbox" checked={usePrefix} onChange={(e) => setUsePrefix(e.target.checked)} />
              <span className="dot rounded-[2px]" />
              I prefix
            </label>
            <label className="radio" title='Append "BE" for API models (IGetTemplateEngineResponseBE)'>
              <input type="checkbox" checked={useBeSuffix} onChange={(e) => setUseBeSuffix(e.target.checked)} />
              <span className="dot rounded-[2px]" />
              BE suffix
            </label>
          </div>
        )}
        {error ? (
          <div className="text-sm text-delete">{error}</div>
        ) : (
          <pre className="text-xs bg-surface border border-divider rounded-md p-2 overflow-auto max-h-96 whitespace-pre-wrap font-mono">{output}</pre>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
          {!error && (
            <button type="button" onClick={handleCopy} className="btn btn-primary">Copy</button>
          )}
        </div>
      </div>
    </div>
  )
}
