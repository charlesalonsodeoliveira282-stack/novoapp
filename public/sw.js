// NovaPlay Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated')
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  let data = {
    title: 'NovaPlay',
    body: 'Você tem uma nova notificação',
    icon: '/novaplay-logo.png',
    badge: '/icon-light-32x32.png'
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/novaplay-logo.png',
    badge: data.badge || '/icon-light-32x32.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'novaplay-notification',
    requireInteraction: true,
    data: data
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window if no window is open
      if (clients.openWindow) {
        return clients.openWindow('/dashboard')
      }
    })
  )
})
