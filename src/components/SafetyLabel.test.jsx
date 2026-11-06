import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SAFETY_LABEL } from '../lib/constants'
import { SafetyLabel } from './SafetyLabel'

describe('SafetyLabel', () => {
  it('shows the fixed warning and nothing that calls the toy safe to eat', () => {
    const html = renderToStaticMarkup(<SafetyLabel />)
    expect(html).toContain(SAFETY_LABEL)
    expect(html).not.toMatch(/safe to eat|food-safe|skin-safe|edible toy/i)
    expect(html.match(/Not edible/g)).toHaveLength(1)
  })
})
