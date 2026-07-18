import { useMemo, useState } from 'react'
import type { ApiSpec } from './types'
import { schemasToTypeScript } from '../../lib/openapiToTs'
import { toCreateEndpoints, detectCommonPrefix } from '../../lib/openapiToEndpoints'

interface ExportSpecModalProps {
  spec: ApiSpec
  format: 'models' | 'endpoints'
  onClose: () => void
  onCopied: () => void
}

export function ExportSpecModal({ spec, format, onClose, onCopied }: ExportSpecModalProps) {
  const [usePrefix, setUsePrefix] = useState(true)
  const [useBeSuffix, setUseBeSuffix] = useState(true)
  const [stripPrefix, setStripPrefix] = useState(() => detectCommonPrefix(spec.endpoints))
  const [groupByTag, setGroupByTag] = useState(true)

  const output = useMemo(() => {
    if (format === 'endpoints') return toCreateEndpoints(spec.endpoints, { stripPrefix: stripPrefix.trim(), groupByTag })
    return schemasToTypeScript(spec.models ?? [], {
      prefix: usePrefix ? 'I' : '',
      suffix: useBeSuffix ? 'BE' : '',
    })
  }, [spec, format, usePrefix, useBeSuffix, stripPrefix, groupByTag])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    onCopied()
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog" style={{ width: 'min(640px, 90vw)' }}>
        <h2 className="dialog-title">
          {format === 'models' ? 'TypeScript models (from components.schemas)' : 'createEndpoints(basePath)'}
        </h2>
        {format === 'models' ? (
          <div className="flex items-center gap-4 text-sm">
            <label className="radio">
              <input type="checkbox" checked={usePrefix} onChange={(e) => setUsePrefix(e.target.checked)} />
              <span className="dot rounded-[2px]" />
              I prefix
            </label>
            <label className="radio">
              <input type="checkbox" checked={useBeSuffix} onChange={(e) => setUseBeSuffix(e.target.checked)} />
              <span className="dot rounded-[2px]" />
              BE suffix
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <label className="field flex items-center gap-2 m-0">
              <span className="m-0">Strip prefix</span>
              <input
                value={stripPrefix}
                onChange={(e) => setStripPrefix(e.target.value)}
                placeholder="/client-api/v1"
                className="input font-mono text-xs"
                style={{ width: 176 }}
              />
            </label>
            <label className="radio" title="Group endpoints by tag first, then by method inside each tag">
              <input type="checkbox" checked={groupByTag} onChange={(e) => setGroupByTag(e.target.checked)} />
              <span className="dot rounded-[2px]" />
              Group by tag
            </label>
          </div>
        )}
        <pre className="text-xs bg-surface border border-divider rounded-md p-2 overflow-auto max-h-[28rem] whitespace-pre-wrap font-mono">{output}</pre>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
          <button type="button" onClick={handleCopy} className="btn btn-primary">Copy</button>
        </div>
      </div>
    </div>
  )
}
