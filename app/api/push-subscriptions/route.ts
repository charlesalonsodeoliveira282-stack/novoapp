import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { clientId, subscription } = await request.json()

    if (!clientId || !subscription) {
      return NextResponse.json(
        { error: 'clientId and subscription are required' },
        { status: 400 }
      )
    }

    console.log('[v0] Registering push subscription for client:', clientId)

    const { endpoint, keys } = subscription

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('endpoint', endpoint)
      .single()

    if (existing) {
      console.log('[v0] Subscription already exists, updating...')
      const { data, error } = await supabase
        .from('push_subscriptions')
        .update({
          client_id: clientId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString()
        })
        .eq('endpoint', endpoint)
        .select()

      if (error) {
        console.error('[v0] Error updating subscription:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Subscription updated', data })
    }

    // Create new subscription
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        client_id: clientId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      })
      .select()

    if (error) {
      console.error('[v0] Error creating subscription:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[v0] Push subscription registered successfully')
    return NextResponse.json({ message: 'Subscription registered', data })
  } catch (error: any) {
    console.error('[v0] Error in subscription API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpoint is required' },
        { status: 400 }
      )
    }

    console.log('[v0] Unregistering push subscription')

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('[v0] Error deleting subscription:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[v0] Push subscription unregistered successfully')
    return NextResponse.json({ message: 'Subscription unregistered' })
  } catch (error: any) {
    console.error('[v0] Error in subscription delete API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
