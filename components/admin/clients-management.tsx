'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { supabase, type Client } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Bell, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ClientsManagementProps {
  onUpdate?: () => void
}

export default function ClientsManagement({ onUpdate }: ClientsManagementProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    server_username: '',
    server_password: '',
    expiration_date: '',
    is_active: true,
    loyalty_points: 0
  })
  const [pointsToAdd, setPointsToAdd] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    loadClients()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('clients_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        loadClients()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setClients(data)
      onUpdate?.()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingClient) {
      // Update existing client
      const { error } = await supabase
        .from('clients')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClient.id)

      if (!error) {
        await checkAndCreateExpirationNotification(editingClient.id, formData.expiration_date)
      }
    } else {
      // Create new client
      const { data, error } = await supabase
        .from('clients')
        .insert([formData])
        .select()
        .single()

      if (!error && data) {
        await checkAndCreateExpirationNotification(data.id, formData.expiration_date)
      }
    }

    resetForm()
    loadClients()
  }

  const checkAndCreateExpirationNotification = async (clientId: string, expirationDate: string) => {
    if (!expirationDate) return

    const expDate = new Date(expirationDate)
    const now = new Date()
    const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiration <= 7 && daysUntilExpiration >= 0) {
      await supabase
        .from('notifications')
        .insert([{
          client_id: clientId,
          message: `Sua assinatura vence em ${daysUntilExpiration} dias. Renove para continuar usando o serviço!`,
          type: 'warning'
        }])
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      
      loadClients()
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      username: client.username,
      password: client.password,
      server_username: client.server_username || '',
      server_password: client.server_password || '',
      expiration_date: client.expiration_date ? format(new Date(client.expiration_date), 'yyyy-MM-dd') : '',
      is_active: client.is_active,
      loyalty_points: client.loyalty_points || 0
    })
    setIsDialogOpen(true)
  }

  const handleAddPoints = async (clientId: string) => {
    const points = pointsToAdd[clientId] || 0
    if (points <= 0) {
      alert('Por favor, insira um valor válido de pontos')
      return
    }

    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const newTotal = (client.loyalty_points || 0) + points
    console.log('[v0] Adding points:', { clientId, currentPoints: client.loyalty_points, pointsToAdd: points, newTotal })

    const { data, error } = await supabase
      .from('clients')
      .update({
        loyalty_points: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select()

    if (error) {
      console.error('[v0] Error updating points:', error)
      alert('Erro ao adicionar pontos. Verifique se a coluna loyalty_points existe no banco de dados.')
      return
    }

    console.log('[v0] Points updated successfully:', data)

    // Check if client reached 5000 points milestone
    if (newTotal >= 5000 && (client.loyalty_points || 0) < 5000) {
      await supabase
        .from('notifications')
        .insert([{
          client_id: clientId,
          message: 'Parabéns! Você atingiu 5.000 pontos e ganhou desconto na mensalidade!',
          type: 'success'
        }])
    }

    setPointsToAdd({ ...pointsToAdd, [clientId]: 0 })
    loadClients()
    alert(`${points} pontos adicionados com sucesso! Total: ${newTotal} pontos`)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      server_username: '',
      server_password: '',
      expiration_date: '',
      is_active: true,
      loyalty_points: 0
    })
    setEditingClient(null)
    setIsDialogOpen(false)
  }

  const sendExpirationReminder = async (client: Client) => {
    if (!client.expiration_date) return

    const expDate = new Date(client.expiration_date)
    const daysUntilExpiration = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

    await supabase
      .from('notifications')
      .insert([{
        client_id: client.id,
        message: `Lembrete: Sua assinatura vence em ${daysUntilExpiration} dias!`,
        type: 'warning'
      }])

    alert('Notificação enviada com sucesso!')
  }

  const togglePasswordVisibility = (clientId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Clientes</CardTitle>
            <CardDescription>Adicione, edite ou remova clientes do sistema</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={() => { setEditingClient(null); resetForm(); }}>
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente abaixo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="server_username">Usuário do Servidor</Label>
                    <Input
                      id="server_username"
                      value={formData.server_username}
                      onChange={(e) => setFormData({ ...formData, server_username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server_password">Senha do Servidor</Label>
                    <Input
                      id="server_password"
                      type="text"
                      value={formData.server_password}
                      onChange={(e) => setFormData({ ...formData, server_password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiration_date">Data de Vencimento</Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status</Label>
                    <select
                      id="is_active"
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                </div>

                {editingClient && (
                  <div className="space-y-2">
                    <Label htmlFor="loyalty_points">Pontos de Fidelidade</Label>
                    <Input
                      id="loyalty_points"
                      type="number"
                      value={formData.loyalty_points}
                      onChange={(e) => setFormData({ ...formData, loyalty_points: Number(e.target.value) })}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.loyalty_points >= 5000 ? (
                        <span className="text-green-600 font-semibold">✓ Cliente elegível para desconto!</span>
                      ) : (
                        <span>Faltam {5000 - formData.loyalty_points} pontos para desconto</span>
                      )}
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                    {editingClient ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Senha</TableHead>
                <TableHead>Servidor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {showPassword[client.id] ? client.password : '••••••••'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePasswordVisibility(client.id)}
                        className="h-6 w-6 p-0"
                      >
                        {showPassword[client.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {client.server_username && (
                      <div>
                        <div>User: {client.server_username}</div>
                        <div>Pass: {showPassword[client.id + '_server'] ? client.server_password : '••••'}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.expiration_date ? (
                      <span className="text-sm">
                        {format(new Date(client.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                          {client.loyalty_points || 0}
                        </span>
                        {(client.loyalty_points || 0) >= 5000 && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Desconto
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="+"
                          value={pointsToAdd[client.id] || ''}
                          onChange={(e) => setPointsToAdd({ ...pointsToAdd, [client.id]: Number(e.target.value) })}
                          className="w-16 h-8 text-xs"
                          min="0"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddPoints(client.id)}
                          className="h-8 px-2 bg-gradient-to-r from-green-500 to-emerald-600"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.is_active ? 'default' : 'secondary'}>
                      {client.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendExpirationReminder(client)}
                        title="Enviar lembrete"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(client)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum cliente cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
