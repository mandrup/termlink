import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '@/components/ConfirmDialog'

const ESCAPE = ''

describe('ConfirmDialog', () => {
  it('shows the message with a y/n hint', () => {
    const { lastFrame } = render(
      <ConfirmDialog message='Delete "Bastion Host"?' onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(lastFrame()).toContain('Delete "Bastion Host"?')
    expect(lastFrame()).toContain('y confirm')
    expect(lastFrame()).toContain('n cancel')
  })

  it("calls onConfirm on 'y'", () => {
    const onConfirm = vi.fn()
    const { stdin } = render(
      <ConfirmDialog message="Delete?" onConfirm={onConfirm} onCancel={() => {}} />,
    )
    stdin.write('y')
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("calls onCancel on 'n'", () => {
    const onCancel = vi.fn()
    const { stdin } = render(
      <ConfirmDialog message="Delete?" onConfirm={() => {}} onCancel={onCancel} />,
    )
    stdin.write('n')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on escape', async () => {
    const onCancel = vi.fn()
    const { stdin } = render(
      <ConfirmDialog message="Delete?" onConfirm={() => {}} onCancel={onCancel} />,
    )
    stdin.write(ESCAPE)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('ignores unrelated keys', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin } = render(
      <ConfirmDialog message="Delete?" onConfirm={onConfirm} onCancel={onCancel} />,
    )
    stdin.write('x')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
