import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const customPage = readFileSync(
  resolve(process.cwd(), 'app/stickers/custom/page.tsx'),
  'utf8'
)

describe('bespoke custom customer copy', () => {
  it('does not expose Form UX / HMR developer notes on the storefront', () => {
    expect(customPage).not.toMatch(/Form UX v\d/)
    expect(customPage).not.toMatch(/\bHMR\b/)
    expect(customPage).not.toMatch(/Hard-refresh/)
    expect(customPage).not.toMatch(/Ctrl\+F5/)
    expect(customPage).not.toMatch(/Iron-onl/)
    expect(customPage).not.toMatch(/future update/)
    expect(customPage).not.toContain('No custom stickers available.')
  })

  it('keeps the customer admin-review note and a hidden QA marker', () => {
    expect(customPage).toContain(
      'After submission, your file and request details are saved for admin review.'
    )
    expect(customPage).toContain('data-bespoke-ux="revision-v5"')
    expect(customPage).toContain('data-bespoke-ux="success-panel-v5"')
  })
})
