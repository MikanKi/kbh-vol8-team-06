self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {}
  const title = payload.title ?? '終電・終バス通知'
  const options = {
    body: payload.body ?? '最終便の時刻を確認してください。',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
