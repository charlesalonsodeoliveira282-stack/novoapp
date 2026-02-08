import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Client = {
  id: string
  username: string
  password: string
  server_username: string | null
  server_password: string | null
  expiration_date: string | null
  is_active: boolean
  loyalty_points: number
  created_at: string
  updated_at: string
}

export type ServerStatus = {
  id: string
  status: string
  message: string | null
  updated_at: string
}

export type PaymentInfo = {
  id: string
  pix_link: string | null
  pix_key: string | null
  updated_at: string
}

export type Image = {
  id: string
  url: string
  title: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export type Notification = {
  id: string
  client_id: string | null
  title: string | null
  message: string
  type: string
  is_read: boolean
  created_at: string
}
