'use client'

import { useState, useEffect } from 'react'
import { supabase, type Client } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Bell, Send, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function NotificationsManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('NovaPlay')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('username', { ascending: true })

    if (data) {
      setClients(data)
    }
  }

  const toggleClient = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId))
    } else {
      setSelectedClients([...selectedClients, clientId])
    }
  }

  const selectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(clients.map(c => c.id))
    }
  }

  const sendNotification = async () => {
    if (!message.trim()) {
      alert('Por favor, digite uma mensagem')
      return
    }

    if (selectedClients.length === 0) {
      alert('Por favor, selecione pelo menos um cliente')
      return
    }

    setIsSending(true)

    try {
      console.log('[v0] Sending notifications to', selectedClients.length, 'clients')
      
      // Insert notifications into database
      const notifications = selectedClients.map(clientId => ({
        client_id: clientId,
        title: title,
        message: message,
        type: 'info',
        created_at: new Date().toISOString()
      }))

      const { error: dbError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (dbError) {
        console.error('[v0] Error saving notifications to database:', dbError)
        alert('Erro ao salvar notificações no banco de dados')
        return
      }

      console.log('[v0] Notifications saved to database')

      // Send push notifications to all selected clients
      const pushPromises = selectedClients.map(async (clientId) => {
        try {
          const response = await fetch('/api/push-notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              clientId,
              title: title,
              message: message,
              type: 'info'
            })
          })

          if (!response.ok) {
            const error = await response.json()
            console.error('[v0] Push notification failed for client', clientId, error)
            return { success: false, clientId }
          }

          console.log('[v0] Push notification sent to client', clientId)
          return { success: true, clientId }
        } catch (error) {
          console.error('[v0] Error sending push notification:', error)
          return { success: false, clientId }
        }
      })

      const results = await Promise.all(pushPromises)
      const successCount = results.filter(r => r.success).length

      console.log('[v0] Push notifications sent:', successCount, 'of', results.length)

      alert(
        `Notificação salva e enviada!\n\n` +
        `✅ Salva no banco: ${selectedClients.length} cliente(s)\n` +
        `📱 Push enviado: ${successCount} de ${results.length} dispositivo(s)`
      )
      
      setMessage('')
      setTitle('NovaPlay')
      setSelectedClients([])
    } catch (error) {
      console.error('[v0] Error sending notifications:', error)
      alert('Erro ao enviar notificações')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enviar Notificação Push
          </CardTitle>
          <CardDescription>
            Envie notificações instantâneas para os dispositivos dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Notificação</Label>
              <Input
                id="title"
                placeholder="Ex: NovaPlay, Aviso, Promoção..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite a mensagem que será exibida na notificação..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/200 caracteres
              </p>
            </div>
          </div>

          {/* Client Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Selecionar Clientes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="gap-2 bg-transparent"
              >
                <Users className="h-4 w-4" />
                {selectedClients.length === clients.length ? 'Desmarcar' : 'Selecionar'} Todos
              </Button>
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum cliente cadastrado
                </p>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleClient(client.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleClient(client.id)}
                      className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{client.username}</p>
                      {client.server_username && (
                        <p className="text-xs text-muted-foreground">
                          Servidor: {client.server_username}
                        </p>
                      )}
                    </div>
                    <Badge variant={client.is_active ? 'default' : 'secondary'} className="text-xs">
                      {client.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-muted-foreground">
                {selectedClients.length} de {clients.length} cliente(s) selecionado(s)
              </p>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={sendNotification}
            disabled={isSending || !message.trim() || selectedClients.length === 0}
            className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            size="lg"
          >
            <Send className="h-5 w-5" />
            {isSending ? 'Enviando...' : `Enviar Notificação ${selectedClients.length > 0 ? `(${selectedClients.length})` : ''}`}
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900">
                Como funcionam as notificações push?
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>As notificações aparecem mesmo com o app fechado ou tela bloqueada</li>
                <li>O cliente precisa permitir notificações no primeiro acesso</li>
                <li>Funciona em qualquer dispositivo (celular, tablet, computador)</li>
                <li>O cliente é notificado instantaneamente após você enviar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
