import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@novaplay.com',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, title, message, type } = await request.json()

    if (!clientId || !message) {
      return NextResponse.json(
        { error: 'clientId and message are required' },
        { status: 400 }
      )
    }

    console.log('[v0] Sending push notification to client:', clientId)

    // Get all push subscriptions for this client
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('client_id', clientId)

    if (subError) {
      console.error('[v0] Error fetching subscriptions:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    console.log('[v0] Found subscriptions:', subscriptions?.length || 0)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No push subscriptions found for this client' },
        { status: 404 }
      )
    }

    // Send push notification to all subscriptions
    const notificationPayload = JSON.stringify({
      title: title || 'Nova Notificação',
      body: message,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: '/dashboard',
        type: type || 'info'
      }
    })

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          notificationPayload
        )
        console.log('[v0] Push notification sent successfully')
        return { success: true, subscriptionId: sub.id }
      } catch (error: any) {
        console.error('[v0] Error sending push notification:', error)
        
        // If subscription is invalid, remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('[v0] Removing invalid subscription:', sub.id)
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
        
        return { success: false, subscriptionId: sub.id, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length

    console.log('[v0] Push notifications sent:', successCount, 'of', results.length)

    return NextResponse.json({
      message: `Push notifications sent to ${successCount} of ${results.length} subscriptions`,
      results
    })
  } catch (error: any) {
    console.error('[v0] Error in push notification API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
