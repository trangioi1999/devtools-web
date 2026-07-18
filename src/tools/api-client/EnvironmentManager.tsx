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
  const [manageOpen, setManageOpen] = useState(false)
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
    <>
      <label className="field flex items-center gap-2 m-0">
        <span className="text-[11px] uppercase tracking-[0.08em] text-neutral-600 whitespace-nowrap">Environment</span>
        <select
          aria-label="Active environment"
          value={activeId ?? ''}
          onChange={(e) => handleSelectActive(e.target.value)}
          className="input"
          style={{ minHeight: 32, width: 'auto', padding: '4px 10px' }}
        >
          <option value="">— none —</option>
          {envs.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </label>

      <button type="button" onClick={handleNew} className="btn btn-ghost">
        + New environment
      </button>
      <button type="button" onClick={() => setManageOpen(true)} className="btn btn-ghost">
        Manage…
      </button>

      {manageOpen && !draft && (
        <div className="dialog-backdrop">
          <div className="dialog dialog-wide">
            <h2 className="dialog-title">Environments</h2>
            <div className="flex flex-col gap-2">
              {envs.length === 0 && <div className="text-sm text-muted">No environments yet.</div>}
              {envs.map((e) => (
                <div key={e.id} className="flex items-center gap-2 border border-divider rounded-md px-3 py-2">
                  <span className="font-mono text-sm flex-1">{e.name || '(unnamed)'}</span>
                  <span className="text-xs text-muted font-mono truncate max-w-[40%]">{e.baseUrl}</span>
                  <button type="button" onClick={() => setDraft(e)} className="btn btn-ghost">Edit</button>
                  <button type="button" onClick={() => handleDelete(e.id)} className="btn btn-ghost" style={{ color: 'var(--color-delete)' }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={() => setManageOpen(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <h2 className="dialog-title">{envs.some((e) => e.id === draft.id) ? 'Edit environment' : 'New environment'}</h2>
            <label className="field">
              <label>Name</label>
              <input
                aria-label="Name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="input"
              />
            </label>
            <label className="field">
              <label>Base URL</label>
              <input
                aria-label="Base URL"
                value={draft.baseUrl}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                className="input font-mono"
              />
            </label>
            <label className="field">
              <label>Auth type</label>
              <select
                aria-label="Auth type"
                value={draft.auth.type}
                onChange={(e) => updateAuthType(e.target.value as AuthConfig['type'])}
                className="input"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="apiKey">API Key</option>
                <option value="basic">Basic auth</option>
              </select>
            </label>

            {draft.auth.type === 'bearer' && (
              <label className="field">
                <label>Token</label>
                <input
                  aria-label="Token"
                  value={draft.auth.token}
                  onChange={(e) => setDraft({ ...draft, auth: { type: 'bearer', token: e.target.value } })}
                  className="input font-mono"
                />
              </label>
            )}

            {draft.auth.type === 'apiKey' && (
              <>
                <label className="field">
                  <label>Key name</label>
                  <input
                    aria-label="Key name"
                    value={draft.auth.name}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, name: e.target.value } })
                    }
                    className="input font-mono"
                  />
                </label>
                <label className="field">
                  <label>Value</label>
                  <input
                    aria-label="Key value"
                    value={draft.auth.value}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, value: e.target.value } })
                    }
                    className="input font-mono"
                  />
                </label>
                <label className="field">
                  <label>Location</label>
                  <select
                    aria-label="Key location"
                    value={draft.auth.location}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, location: e.target.value as 'header' | 'query' } })
                    }
                    className="input"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query param</option>
                  </select>
                </label>
              </>
            )}

            {draft.auth.type === 'basic' && (
              <>
                <label className="field">
                  <label>Username</label>
                  <input
                    aria-label="Username"
                    value={draft.auth.username}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'basic'}>, username: e.target.value } })
                    }
                    className="input"
                  />
                </label>
                <label className="field">
                  <label>Password</label>
                  <input
                    aria-label="Password"
                    type="password"
                    value={draft.auth.password}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'basic'}>, password: e.target.value } })
                    }
                    className="input"
                  />
                </label>
              </>
            )}

            <div className="dialog-actions">
              <button type="button" onClick={() => setDraft(null)} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={handleSave} className="btn btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
