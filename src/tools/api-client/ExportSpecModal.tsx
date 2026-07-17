import { useMemo, useState } from 'react'
import type { ApiSpec } from './types'
import { schemasToTypeScript } from '../../lib/openapiToTs'
import { toCreateEndpoints } from '../../lib/openapiToEndpoints'

interface ExportSpecModalProps {
  spec: ApiSpec
  format: 'models' | 'endpoints'
  onClose: () => void
  onCopied: () => void
}

export function ExportSpecModal({ spec, format, onClose, onCopied }: ExportSpecModalProps) {
  const [usePrefix, setUsePrefix] = useState(true)
  const [useBeSuffix, setUseBeSuffix] = useState(true)

  const output = useMemo(() => {
    if (format === 'endpoints') return toCreateEndpoints(spec.endpoints)
    return schemasToTypeScript(spec.models ?? [], {
      prefix: usePrefix ? 'I' : '',
      suffix: useBeSuffix ? 'BE' : '',
    })
  }, [spec, format, usePrefix, useBeSuffix])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    onCopied()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
      <div className="bg-white rounded-lg p-4 w-[40rem] max-w-[90vw] flex flex-col gap-2">
        <h2 className="font-semibold text-sm">
          {format === 'models' ? 'TypeScript models (from components.schemas)' : 'createEndpoints(basePath)'}
        </h2>
        {format === 'models' && (
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5 text-slate-700 select-none">
              <input type="checkbox" checked={usePrefix} onChange={(e) => setUsePrefix(e.target.checked)} />
              I prefix
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 select-none">
              <input type="checkbox" checked={useBeSuffix} onChange={(e) => setUseBeSuffix(e.target.checked)} />
              BE suffix
            </label>
          </div>
        )}
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-[28rem] whitespace-pre-wrap">{output}</pre>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1 text-sm rounded bg-slate-200">Close</button>
          <button onClick={handleCopy} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Copy</button>
        </div>
      </div>
    </div>
  )
}
