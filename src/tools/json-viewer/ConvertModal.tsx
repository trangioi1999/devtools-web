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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
      <div className="bg-white rounded-lg p-4 w-[32rem] flex flex-col gap-2">
        <h2 className="font-semibold text-sm">{format === 'yaml' ? 'YAML' : 'TypeScript interface'}</h2>
        {format === 'typescript' && (
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5 text-slate-700">
              Root name
              <input
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                placeholder="Root"
                className="px-2 py-0.5 border border-slate-300 rounded w-40 font-mono text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 select-none" title='Prefix every interface with "I" (IRoot, IEnvironment)'>
              <input type="checkbox" checked={usePrefix} onChange={(e) => setUsePrefix(e.target.checked)} />
              I prefix
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 select-none" title='Append "BE" for API models (IGetTemplateEngineResponseBE)'>
              <input type="checkbox" checked={useBeSuffix} onChange={(e) => setUseBeSuffix(e.target.checked)} />
              BE suffix
            </label>
          </div>
        )}
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-96 whitespace-pre-wrap">{output}</pre>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1 text-sm rounded bg-slate-200">Close</button>
          {!error && (
            <button onClick={handleCopy} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Copy</button>
          )}
        </div>
      </div>
    </div>
  )
}
