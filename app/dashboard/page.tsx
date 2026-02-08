'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase, type Client, type ServerStatus, type PaymentInfo, type Image as ImageType, type Notification } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogOut, Copy, Check, Server, CreditCard, AlertCircle, CheckCircle2, XCircle, Calendar, User as UserIcon, Key, MessageSquare, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export default function ClientDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [images, setImages] = useState<ImageType[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const { isSupported, isSubscribed, subscribe: subscribeToPush } = usePushNotifications(client?.id)

  const setupPushNotifications = async () => {
    if (isSupported && !isSubscribed && client?.id) {
      console.log('[v0] Setting up push notifications for client:', client.id)
      const success = await subscribeToPush()
      if (success) {
        console.log('[v0] Push notifications enabled successfully')
      }
    }
  }

  useEffect(() => {
    // Check both sessionStorage and localStorage for authentication
    let clientId = sessionStorage.getItem('client_id')
    let auth = sessionStorage.getItem('client_authenticated')
    
    // If not in session, check localStorage (persistent login)
    if (auth !== 'true' || !clientId) {
      clientId = localStorage.getItem('novaplay_client_id')
      auth = localStorage.getItem('novaplay_client_auth')
      
      if (auth === 'true' && clientId) {
        // Restore session from localStorage
        sessionStorage.setItem('client_id', clientId)
        sessionStorage.setItem('client_authenticated', 'true')
      } else {
        // No valid authentication found
        router.push('/')
        return
      }
    }
    
    // Verify client is still active in database
    const verifyClientStatus = async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('is_active', true)
        .single()

      if (!client) {
        // Client was deleted or deactivated by admin, logout
        console.log('[v0] Client not found or inactive, logging out')
        handleLogout()
        return
      }

      setIsAuthenticated(true)
      loadClientData(clientId)
      loadServerStatus()
      loadPaymentInfo()
      loadImages()
      loadNotifications(clientId)
      
      // Setup push notifications
      setupPushNotifications()
    }

    verifyClientStatus()

    // Subscribe to real-time changes for this specific client
    console.log('[v0] Setting up realtime for client:', clientId)
    const clientChannel = supabase
      .channel('client_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients',
        filter: `id=eq.${clientId}`
      }, (payload) => {
        console.log('[v0] ✅ Client data updated via realtime:', payload)
        console.log('[v0] Event type:', payload.eventType)
        console.log('[v0] New data:', payload.new)
        loadClientData(clientId)
      })
      .subscribe((status) => {
        console.log('[v0] Client channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[v0] 🎉 Successfully subscribed to client updates')
        }
      })

    const serverChannel = supabase
      .channel('server_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_status' }, () => {
        loadServerStatus()
      })
      .subscribe()

    const paymentChannel = supabase
      .channel('payment_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_info' }, () => {
        loadPaymentInfo()
      })
      .subscribe()

    const imagesChannel = supabase
      .channel('images_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'images' }, () => {
        loadImages()
      })
      .subscribe()

    const notificationsChannel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `client_id=eq.${clientId}` 
      }, (payload) => {
        console.log('[v0] New notification received:', payload)
        loadNotifications(clientId)
        
        // Show browser notification
        if (payload.new && typeof payload.new === 'object') {
          const notification = payload.new as Notification
          showLocalNotification(
            notification.title || 'NovaPlay',
            notification.message || 'Você tem uma nova notificação'
          )
        }
      })
      .subscribe()

    // Periodic check to verify client status (every 5 minutes)
    const statusCheckInterval = setInterval(async () => {
      const currentClientId = sessionStorage.getItem('client_id')
      if (currentClientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('is_active')
          .eq('id', currentClientId)
          .single()

        if (!client || !client.is_active) {
          console.log('[v0] Client status changed, logging out')
          handleLogout()
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => {
      supabase.removeChannel(clientChannel)
      supabase.removeChannel(serverChannel)
      supabase.removeChannel(paymentChannel)
      supabase.removeChannel(imagesChannel)
      supabase.removeChannel(notificationsChannel)
      clearInterval(statusCheckInterval)
    }
  }, [router])

  // Auto-slide carousel
  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [images.length])

  const loadClientData = async (clientId: string) => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (data) {
      setClient(data)
    }
  }

  const loadServerStatus = async () => {
    const { data } = await supabase
      .from('server_status')
      .select('*')
      .single()

    if (data) {
      setServerStatus(data)
    }
  }

  const loadPaymentInfo = async () => {
    const { data } = await supabase
      .from('payment_info')
      .select('*')
      .single()

    if (data) {
      setPaymentInfo(data)
    }
  }

  const loadImages = async () => {
    const { data } = await supabase
      .from('images')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (data) {
      setImages(data)
    }
  }

  const loadNotifications = async (clientId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (data) {
      setNotifications(data)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    const clientId = sessionStorage.getItem('client_id')
    if (clientId) {
      loadNotifications(clientId)
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [key]: true })
    setTimeout(() => {
      setCopied({ ...copied, [key]: false })
    }, 2000)
  }

  const handleLogout = () => {
    // Clear both sessionStorage and localStorage
    sessionStorage.removeItem('client_id')
    sessionStorage.removeItem('client_authenticated')
    
    localStorage.removeItem('novaplay_client_id')
    localStorage.removeItem('novaplay_client_username')
    localStorage.removeItem('novaplay_client_auth')
    localStorage.removeItem('novaplay_client_login_time')
    
    router.push('/')
  }

  const getStatusIcon = () => {
    if (!serverStatus) return <Server className="h-5 w-5" />
    
    switch (serverStatus.status) {
      case 'online':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Server className="h-5 w-5" />
    }
  }

  const getStatusColor = () => {
    if (!serverStatus) return 'bg-gray-100 border-gray-200'
    
    switch (serverStatus.status) {
      case 'online':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'offline':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const getDaysUntilExpiration = () => {
    if (!client?.expiration_date) return null
    
    const expDate = new Date(client.expiration_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Reset to start of day
    expDate.setHours(0, 0, 0, 0) // Reset to start of day
    const days = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return days
  }

  const getLoyaltyPointsStatus = () => {
    const points = client?.loyalty_points || 0
    if (points >= 5000) {
      return {
        status: 'eligible',
        message: 'Você tem desconto na mensalidade!',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        progress: 100
      }
    }
    return {
      status: 'accumulating',
      message: `Faltam ${5000 - points} pontos para desconto`,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 border-cyan-200',
      progress: (points / 5000) * 100
    }
  }

  if (!isAuthenticated || !client) {
    return null
  }

  const daysLeft = getDaysUntilExpiration()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                <Image
                  src="/novaplay-logo.png"
                  alt="NovaPlay"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  NovaPlay
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Olá, {client.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="gap-1 text-xs sm:text-sm"
              >
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Image Carousel */}
      {images.length > 0 && (
        <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 border-b">
          <div className="container mx-auto px-0 sm:px-4">
            <div className="relative w-full aspect-video max-h-[50vh] overflow-hidden group">
              <div 
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {images.map((image, index) => (
                  <div key={image.id} className="min-w-full h-full relative">
                    <Image
                      src={image.url || "/placeholder.svg"}
                      alt={image.title || 'Imagem'}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                    {image.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <p className="text-white font-medium text-sm sm:text-base">{image.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex 
                          ? 'bg-white w-6' 
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Ir para imagem ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation Arrows (visible on hover) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Imagem anterior"
                  >
                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Próxima imagem"
                  >
                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Notifications */}
        {notifications.map((notification) => (
          <Dialog key={notification.id} open={true} onOpenChange={() => markNotificationAsRead(notification.id)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {notification.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  Aviso Importante
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  {notification.message}
                </DialogDescription>
              </DialogHeader>
              <Button onClick={() => markNotificationAsRead(notification.id)}>
                Entendi
              </Button>
            </DialogContent>
          </Dialog>
        ))}

        {/* Expiration Warning */}
        {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-orange-900">
                    Sua assinatura vence em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}!
                  </p>
                  <p className="text-xs sm:text-sm text-orange-700 mt-1">
                    Renove para continuar aproveitando nossos servi��os.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Server Status */}
        <Card className={`border ${getStatusColor()}`}>
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                {getStatusIcon()}
                <div>
                  <CardTitle className="capitalize text-base sm:text-lg">{serverStatus?.status || 'Carregando...'}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Status do Servidor</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          {serverStatus?.message && (
            <CardContent className="pt-0">
              <p className="text-xs sm:text-sm">{serverStatus.message}</p>
            </CardContent>
          )}
        </Card>

        {/* Loyalty Points */}
        <Card className={`border-2 ${getLoyaltyPointsStatus().bgColor}`}>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Pontos de Fidelidade
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Acumule pontos e ganhe desconto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center space-y-2">
              <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {client.loyalty_points || 0}
              </p>
              <p className={`text-sm sm:text-base font-semibold ${getLoyaltyPointsStatus().color}`}>
                {getLoyaltyPointsStatus().message}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>5.000 pontos</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(getLoyaltyPointsStatus().progress, 100)}%` }}
                />
              </div>
            </div>
            {getLoyaltyPointsStatus().status === 'eligible' && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
                <p className="text-sm font-semibold text-green-700">
                  🎉 Parabéns! Você tem direito a desconto na mensalidade!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  Data de Vencimento
                </Label>
                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-medium">
                    {client.expiration_date
                      ? format(new Date(client.expiration_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'Sem data definida'}
                  </p>
                  {daysLeft !== null && (
                    <p className={`text-xs sm:text-sm font-semibold ${
                      daysLeft < 0 
                        ? 'text-red-600' 
                        : daysLeft <= 7 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                    }`}>
                      {daysLeft < 0 
                        ? `Vencido há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? 's' : ''}`
                        : daysLeft === 0
                        ? 'Vence hoje!'
                        : `Faltam ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm text-muted-foreground">Status</Label>
                <div>
                  <Badge variant={client.is_active ? 'default' : 'secondary'} className="text-xs">
                    {client.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server Credentials */}
        {(client.server_username || client.server_password) && (
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Key className="h-4 w-4 sm:h-5 sm:w-5" />
                Credenciais do Servidor
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Copie suas credenciais de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {client.server_username && (
                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-muted rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                    <p className="font-mono text-xs sm:text-sm font-medium truncate">{client.server_username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(client.server_username!, 'username')}
                    className="ml-2 flex-shrink-0"
                  >
                    {copied.username ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </Button>
                </div>
              )}
              {client.server_password && (
                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-muted rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Senha</p>
                    <p className="font-mono text-xs sm:text-sm font-medium truncate">{client.server_password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(client.server_password!, 'password')}
                    className="ml-2 flex-shrink-0"
                  >
                    {copied.password ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        {(paymentInfo?.pix_key || paymentInfo?.pix_link) && (
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                Pagamento
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Renove sua assinatura via PIX</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {paymentInfo.pix_key && (
                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-muted rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Chave PIX</p>
                    <p className="font-mono text-xs sm:text-sm font-medium truncate">{paymentInfo.pix_key}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(paymentInfo.pix_key!, 'pix')}
                    className="ml-2 flex-shrink-0"
                  >
                    {copied.pix ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </Button>
                </div>
              )}
              {paymentInfo.pix_link && (
                <Button
                  className="w-full h-10 sm:h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-sm sm:text-base"
                  asChild
                >
                  <a href={paymentInfo.pix_link} target="_blank" rel="noopener noreferrer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar Mensalidade via PIX
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Precisa de Suporte?</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Entre em contato conosco</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 sm:py-4 bg-transparent justify-start"
                asChild
              >
                <a href="https://wa.me/5541991163356" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm sm:text-base font-medium">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">41 99116-3356</p>
                  </div>
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 sm:py-4 bg-transparent justify-start"
                asChild
              >
                <a href="mailto:suporte.novaplay@gmail.com">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm sm:text-base font-medium">Email</p>
                    <p className="text-xs text-muted-foreground break-all">suporte.novaplay@gmail.com</p>
                  </div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
