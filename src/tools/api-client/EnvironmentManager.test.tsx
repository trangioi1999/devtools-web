import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnvironmentManager } from './EnvironmentManager'
import { listEnvironments, getActiveEnvironmentId } from './environmentStore'

describe('EnvironmentManager', () => {
  beforeEach(() => localStorage.clear())

  it('creates a new environment and sets it active', async () => {
    const user = userEvent.setup()
    render(<EnvironmentManager />)

    await user.click(screen.getByRole('button', { name: /new environment/i }))
    await user.type(screen.getByLabelText(/name/i), 'dev')
    await user.type(screen.getByLabelText(/base url/i), 'https://dev.example.com')
    await user.click(screen.getByRole('button', { name: /save/i }))

    const envs = listEnvironments()
    expect(envs).toHaveLength(1)
    expect(envs[0].name).toBe('dev')
    expect(getActiveEnvironmentId()).toBe(envs[0].id)
  })

  it('switches the active environment via the dropdown', async () => {
    const user = userEvent.setup()
    render(<EnvironmentManager />)

    for (const name of ['dev', 'prod']) {
      await user.click(screen.getByRole('button', { name: /new environment/i }))
      await user.type(screen.getByLabelText(/name/i), name)
      await user.type(screen.getByLabelText(/base url/i), `https://${name}.example.com`)
      await user.click(screen.getByRole('button', { name: /save/i }))
    }

    const select = screen.getByLabelText(/active environment/i)
    await user.selectOptions(select, 'dev')

    const devId = listEnvironments().find((e) => e.name === 'dev')!.id
    expect(getActiveEnvironmentId()).toBe(devId)
  })
})
