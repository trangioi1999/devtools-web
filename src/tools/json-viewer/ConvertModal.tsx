import { toYaml, toTypeScriptInterface } from '../../lib/jsonConvert'

interface ConvertModalProps {
  value: unknown
  format: 'yaml' | 'typescript'
  onClose: () => void
  onCopied: () => void
}

export function ConvertModal({ value, format, onClose, onCopied }: ConvertModalProps) {
  let output: string
  let error: string | null = null

  try {
    output = format === 'yaml' ? toYaml(value) : toTypeScriptInterface(value)
  } catch (err) {
    output = ''
    error = (err as Error).message
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    onCopied()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
      <div className="bg-white rounded-lg p-4 w-[32rem] flex flex-col gap-2">
        <h2 className="font-semibold text-sm">{format === 'yaml' ? 'YAML' : 'TypeScript interface'}</h2>
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
