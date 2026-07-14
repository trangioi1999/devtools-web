export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'apiKey'; location: 'header' | 'query'; name: string; value: string }
  | { type: 'basic'; username: string; password: string }

export interface Environment {
  id: string
  name: string
  baseUrl: string
  auth: AuthConfig
}

const ENVIRONMENTS_KEY = 'devtools:api-client:environments'
const ACTIVE_ENV_KEY = 'devtools:api-client:active-environment'

export function listEnvironments(): Environment[] {
  const raw = localStorage.getItem(ENVIRONMENTS_KEY)
  return raw ? (JSON.parse(raw) as Environment[]) : []
}

function writeEnvironments(envs: Environment[]): void {
  localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(envs))
}

export function saveEnvironment(env: Environment): void {
  const envs = listEnvironments()
  const idx = envs.findIndex((e) => e.id === env.id)
  if (idx >= 0) envs[idx] = env
  else envs.push(env)
  writeEnvironments(envs)
}

export function deleteEnvironment(id: string): void {
  writeEnvironments(listEnvironments().filter((e) => e.id !== id))
}

export function getActiveEnvironmentId(): string | null {
  return localStorage.getItem(ACTIVE_ENV_KEY)
}

export function setActiveEnvironmentId(id: string | null): void {
  if (id === null) localStorage.removeItem(ACTIVE_ENV_KEY)
  else localStorage.setItem(ACTIVE_ENV_KEY, id)
}
