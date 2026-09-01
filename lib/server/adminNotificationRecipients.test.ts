import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveAdminNotificationRecipients } from './adminNotificationRecipients'

describe('resolveAdminNotificationRecipients', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses ADMIN_NOTIFICATION_EMAIL when set (comma-separated)', () => {
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'ops@selpic.com.au, backup@example.com')
    vi.stubEnv('CONTACT_ADMIN_EMAIL', 'ignored@example.com')
    expect(resolveAdminNotificationRecipients()).toEqual([
      'ops@selpic.com.au',
      'backup@example.com',
    ])
  })

  it('falls back to CONTACT_ADMIN_EMAIL then company info@', () => {
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', '')
    vi.stubEnv('CONTACT_ADMIN_EMAIL', 'legacy@selpic.com.au')
    expect(resolveAdminNotificationRecipients()).toEqual(['legacy@selpic.com.au'])

    vi.stubEnv('CONTACT_ADMIN_EMAIL', '')
    expect(resolveAdminNotificationRecipients()).toEqual(['info@selpic.com.au'])
  })
})
