'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Server, CreditCard, LogOut, Bell } from 'lucide-react'
import ClientsManagement from '@/components/admin/clients-management'
import ServerManagement from '@/components/admin/server-management'
import ImagesManagement from '@/components/admin/images-management'
import PaymentManagement from '@/components/admin/payment-management'
import NotificationsManagement from '@/components/admin/notifications-management'

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    expiringClients: 0
  })

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_authenticated')
    if (auth !== 'true') {
      router.push('/admin')
      return
    }
    setIsAuthenticated(true)
    loadStats()
  }, [router])

  const loadStats = async () => {
    const { data: clients } = await supabase
      .from('clients')
      .select('*')

    if (clients) {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const active = clients.filter(c => c.is_active).length
      const expiring = clients.filter(c => {
        if (!c.expiration_date) return false
        const expDate = new Date(c.expiration_date)
        return expDate <= weekFromNow && expDate > now
      }).length

      setStats({
        totalClients: clients.length,
        activeClients: active,
        expiringClients: expiring
      })
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated')
    router.push('/admin')
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                <ImageIcon 
                  src="/novaplay-logo.png" 
                  alt="NovaPlay" 
                  className="object-contain" 
                />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  NovaPlay Admin
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Painel de Controle</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="gap-1 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Voltar ao App</span>
                <span className="sm:hidden">App</span>
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

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-cyan-600 font-medium text-xs sm:text-sm">Total de Clientes</CardDescription>
              <CardTitle className="text-3xl sm:text-4xl text-cyan-700">{stats.totalClients}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-600 font-medium text-xs sm:text-sm">Clientes Ativos</CardDescription>
              <CardTitle className="text-3xl sm:text-4xl text-blue-700">{stats.activeClients}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-orange-600 font-medium text-xs sm:text-sm">Vencendo em 7 dias</CardDescription>
              <CardTitle className="text-3xl sm:text-4xl text-orange-700">{stats.expiringClients}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="clients" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white">
            <TabsTrigger 
              value="clients" 
              className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Clientes</span>
              <span className="sm:hidden">CLI</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Notificações</span>
              <span className="sm:hidden">NOT</span>
            </TabsTrigger>
            <TabsTrigger 
              value="server" 
              className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Server className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Servidor</span>
              <span className="sm:hidden">SRV</span>
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Imagens</span>
              <span className="sm:hidden">IMG</span>
            </TabsTrigger>
            <TabsTrigger 
              value="payment" 
              className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pagamento</span>
              <span className="sm:hidden">PAG</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <ClientsManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationsManagement />
          </TabsContent>

          <TabsContent value="server" className="space-y-4">
            <ServerManagement />
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <ImagesManagement />
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <PaymentManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
