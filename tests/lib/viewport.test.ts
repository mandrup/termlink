import { describe, expect, it } from 'vitest'
import { clampToRange, computeListLayout, followFocus } from '@/lib/viewport'

describe('clampToRange', () => {
  it('leaves values inside the range untouched', () => {
    expect(clampToRange(5, 0, 10)).toBe(5)
  })

  it('clamps to the bounds when outside the range', () => {
    expect(clampToRange(-3, 0, 10)).toBe(0)
    expect(clampToRange(30, 0, 10)).toBe(10)
  })
})

describe('followFocus', () => {
  it('returns 0 when everything already fits in the viewport', () => {
    expect(followFocus({ itemCount: 5, focusedIndex: 2, maxVisible: 10, offset: 0 })).toBe(0)
  })

  it('scrolls down just enough to reveal a focused index below the window', () => {
    expect(followFocus({ itemCount: 20, focusedIndex: 9, maxVisible: 5, offset: 0 })).toBe(5)
  })

  it('scrolls up just enough to reveal a focused index above the window', () => {
    expect(followFocus({ itemCount: 20, focusedIndex: 2, maxVisible: 5, offset: 8 })).toBe(2)
  })

  it('does not move the window when the focused index is already visible', () => {
    expect(followFocus({ itemCount: 20, focusedIndex: 6, maxVisible: 5, offset: 5 })).toBe(5)
  })

  it('never scrolls past the last full page', () => {
    expect(
      followFocus({
        itemCount: 20,
        focusedIndex: 19,
        maxVisible: 5,
        offset: 0,
      }),
    ).toBe(15)
  })
})

describe('computeListLayout', () => {
  it('takes roughly a third of the terminal width', () => {
    expect(computeListLayout(100)).toEqual({ listWidth: 30, nameWidth: 20 })
  })

  it('clamps the list width to the minimum on narrow terminals', () => {
    expect(computeListLayout(40).listWidth).toBe(22)
  })

  it('clamps the list width to the maximum on wide terminals', () => {
    expect(computeListLayout(300).listWidth).toBe(44)
  })

  it('never shrinks the name column below its minimum', () => {
    expect(computeListLayout(40).nameWidth).toBe(12)
  })
})
