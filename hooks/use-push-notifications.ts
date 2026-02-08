import { useState, useEffect } from 'react'

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications(clientId?: string) {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
      setIsSubscribed(!!sub)
    } catch (err) {
      console.error('[v0] Error checking subscription:', err)
    }
  }

  const subscribe = async () => {
    if (!clientId) {
      setError('Client ID is required to subscribe')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[v0] Requesting notification permission...')
      
      // Request notification permission
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        setError('Permissão de notificação negada')
        setIsLoading(false)
        return false
      }

      console.log('[v0] Notification permission granted')

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      
      console.log('[v0] Service worker registered')

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      
      if (!vapidPublicKey) {
        console.error('[v0] VAPID public key not configured')
        setError('Configuração de notificações push ausente')
        setIsLoading(false)
        return false
      }

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      console.log('[v0] Push subscription created:', sub)

      // Send subscription to server
      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId,
          subscription: sub.toJSON()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to register subscription on server')
      }

      console.log('[v0] Push subscription registered on server')

      setSubscription(sub)
      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err: any) {
      console.error('[v0] Error subscribing to push notifications:', err)
      setError(err.message || 'Erro ao ativar notificações')
      setIsLoading(false)
      return false
    }
  }

  const unsubscribe = async () => {
    if (!subscription) return false

    setIsLoading(true)
    setError(null)

    try {
      console.log('[v0] Unsubscribing from push notifications...')

      // Unsubscribe from push manager
      await subscription.unsubscribe()

      // Remove subscription from server
      const endpoint = encodeURIComponent(subscription.endpoint)
      await fetch(`/api/push-subscriptions?endpoint=${endpoint}`, {
        method: 'DELETE'
      })

      console.log('[v0] Push subscription removed')

      setSubscription(null)
      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (err: any) {
      console.error('[v0] Error unsubscribing:', err)
      setError(err.message || 'Erro ao desativar notificações')
      setIsLoading(false)
      return false
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe
  }
}
