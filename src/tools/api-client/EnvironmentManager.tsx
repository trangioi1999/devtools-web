import { useState } from 'react'
import {
  type Environment,
  type AuthConfig,
  listEnvironments,
  saveEnvironment,
  deleteEnvironment,
  getActiveEnvironmentId,
  setActiveEnvironmentId,
} from './environmentStore'

function emptyEnvironment(): Environment {
  return { id: crypto.randomUUID(), name: '', baseUrl: '', auth: { type: 'none' } }
}

export function EnvironmentManager() {
  const [envs, setEnvs] = useState<Environment[]>(() => listEnvironments())
  const [activeId, setActiveId] = useState<string | null>(() => getActiveEnvironmentId())
  const [draft, setDraft] = useState<Environment | null>(null)

  const refresh = () => setEnvs(listEnvironments())

  const handleNew = () => setDraft(emptyEnvironment())

  const handleSave = () => {
    if (!draft) return
    saveEnvironment(draft)
    setActiveEnvironmentId(draft.id)
    setActiveId(draft.id)
    setDraft(null)
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteEnvironment(id)
    if (activeId === id) {
      setActiveEnvironmentId(null)
      setActiveId(null)
    }
    refresh()
  }

  const handleSelectActive = (id: string) => {
    setActiveEnvironmentId(id || null)
    setActiveId(id || null)
  }

  const updateAuthType = (type: AuthConfig['type']) => {
    if (!draft) return
    const auth: AuthConfig =
      type === 'bearer' ? { type, token: '' }
      : type === 'apiKey' ? { type, location: 'header', name: '', value: '' }
      : type === 'basic' ? { type, username: '', password: '' }
      : { type: 'none' }
    setDraft({ ...draft, auth })
  }

  return (
    <div className="p-3 border-b border-slate-200 flex items-center gap-3">
      <label className="text-sm flex items-center gap-2">
        Active environment
        <select
          aria-label="Active environment"
          value={activeId ?? ''}
          onChange={(e) => handleSelectActive(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="">— none —</option>
          {envs.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </label>

      <button onClick={handleNew} className="px-3 py-1 text-sm rounded bg-slate-200">
        + New environment
      </button>

      {envs.map((e) => (
        <button key={e.id} onClick={() => handleDelete(e.id)} className="text-xs text-red-600">
          delete {e.name}
        </button>
      ))}

      {draft && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 w-96 flex flex-col gap-2">
            <label className="text-sm">
              Name
              <input
                aria-label="Name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="block w-full border border-slate-300 rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Base URL
              <input
                aria-label="Base URL"
                value={draft.baseUrl}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                className="block w-full border border-slate-300 rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Auth type
              <select
                aria-label="Auth type"
                value={draft.auth.type}
                onChange={(e) => updateAuthType(e.target.value as AuthConfig['type'])}
                className="block w-full border border-slate-300 rounded px-2 py-1"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="apiKey">API Key</option>
                <option value="basic">Basic auth</option>
              </select>
            </label>

            {draft.auth.type === 'bearer' && (
              <label className="text-sm">
                Token
                <input
                  aria-label="Token"
                  value={draft.auth.token}
                  onChange={(e) => setDraft({ ...draft, auth: { type: 'bearer', token: e.target.value } })}
                  className="block w-full border border-slate-300 rounded px-2 py-1"
                />
              </label>
            )}

            {draft.auth.type === 'apiKey' && (
              <>
                <label className="text-sm">
                  Key name
                  <input
                    aria-label="Key name"
                    value={draft.auth.name}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, name: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm">
                  Value
                  <input
                    aria-label="Key value"
                    value={draft.auth.value}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, value: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm">
                  Location
                  <select
                    aria-label="Key location"
                    value={draft.auth.location}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, location: e.target.value as 'header' | 'query' } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query param</option>
                  </select>
                </label>
              </>
            )}

            {draft.auth.type === 'basic' && (
              <>
                <label className="text-sm">
                  Username
                  <input
                    aria-label="Username"
                    value={draft.auth.username}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'basic'}>, username: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm">
                  Password
                  <input
                    aria-label="Password"
                    type="password"
                    value={draft.auth.password}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'basic'}>, password: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
              </>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setDraft(null)} className="px-3 py-1 text-sm rounded bg-slate-200">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
