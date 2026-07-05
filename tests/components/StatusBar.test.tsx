import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import { StatusBar } from '@/components/StatusBar'

describe('StatusBar', () => {
  it('shows the default hint when no message is given', () => {
    const { lastFrame } = render(<StatusBar />)
    expect(lastFrame()).toContain('move')
    expect(lastFrame()).toContain('quit')
  })

  it('shows the given message instead of the default hint', () => {
    const { lastFrame } = render(<StatusBar message="Connected to Bastion Host" />)
    expect(lastFrame()).toContain('Connected to Bastion Host')
    expect(lastFrame()).not.toContain('move')
  })
})
