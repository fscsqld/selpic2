self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch {
        // ignore
      }
      // Claim while still the active worker, then unregister.
      // Cousin: claim() after unregister() → InvalidStateError
      // "Only the active worker can claim clients."
      try {
        await self.clients.claim()
      } catch {
        // ignore — already replaced / not active
      }
      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UNREGISTERED' })
        })
      } catch {
        // ignore
      }
      try {
        await self.registration.unregister()
      } catch {
        // ignore
      }
    })()
  )
})
