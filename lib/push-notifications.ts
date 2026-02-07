export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('[Push] Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error)
      return null
    }
  }
  return null
}

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('[Push] This browser does not support notifications')
    return false
  }

  let permission = Notification.permission

  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  console.log('[Push] Notification permission:', permission)
  return permission === 'granted'
}

export const showLocalNotification = (title: string, body: string) => {
  if (!('Notification' in window)) {
    return
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/novaplay-logo.png',
      badge: '/icon-light-32x32.png',
      vibrate: [200, 100, 200],
      tag: 'novaplay-notification'
    })
  }
}

export const checkNotificationSupport = () => {
  return 'Notification' in window && 'serviceWorker' in navigator
}
