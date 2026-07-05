import { describe, expect, it } from 'vitest'
import { fuzzyMatch, truncate } from '@/lib/text'

describe('truncate', () => {
  it('returns the value unchanged when it fits', () => {
    expect(truncate('Bastion', 18)).toBe('Bastion')
  })

  it('truncates and appends an ellipsis when too long', () => {
    expect(truncate('A Very Long Connection Name', 10)).toBe('A Very Lo…')
  })

  it('hard-truncates without an ellipsis when maxWidth is 1 or less', () => {
    expect(truncate('Bastion', 1)).toBe('B')
    expect(truncate('Bastion', 0)).toBe('')
  })
})

describe('fuzzyMatch', () => {
  it('matches everything and highlights nothing for a blank query', () => {
    expect(fuzzyMatch('Bastion Host', '')).toEqual({
      matched: true,
      indices: [],
    })
    expect(fuzzyMatch('Bastion Host', '   ')).toEqual({
      matched: true,
      indices: [],
    })
  })

  it('matches a contiguous substring case-insensitively', () => {
    expect(fuzzyMatch('Bastion Host', 'BASTION').matched).toBe(true)
  })

  it('matches non-contiguous characters in order', () => {
    const result = fuzzyMatch('bastion.internal.local', 'binl')
    expect(result.matched).toBe(true)
    expect(result.indices).toEqual([0, 4, 6, 15])
  })

  it('does not match when a character is missing', () => {
    expect(fuzzyMatch('bastion.internal.local', 'binlz').matched).toBe(false)
  })

  it('does not match when characters are out of order', () => {
    expect(fuzzyMatch('bastion', 'nots').matched).toBe(false)
  })
})
