'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { supabase, type ServerStatus } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Activity, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

export default function ServerManagement() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [status, setStatus] = useState('online')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadServerStatus()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('server_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_status' }, () => {
        loadServerStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadServerStatus = async () => {
    const { data } = await supabase
      .from('server_status')
      .select('*')
      .single()

    if (data) {
      setServerStatus(data)
      setStatus(data.status)
      setMessage(data.message || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (serverStatus) {
      await supabase
        .from('server_status')
        .update({
          status,
          message,
          updated_at: new Date().toISOString()
        })
        .eq('id', serverStatus.id)
    }

    loadServerStatus()
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-12 w-12 text-yellow-500" />
      case 'offline':
        return <XCircle className="h-12 w-12 text-red-500" />
      default:
        return <Activity className="h-12 w-12 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'from-green-50 to-white border-green-200'
      case 'warning':
        return 'from-yellow-50 to-white border-yellow-200'
      case 'offline':
        return 'from-red-50 to-white border-red-200'
      default:
        return 'from-gray-50 to-white border-gray-200'
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Current Status Display */}
      <Card className={`bg-gradient-to-br ${getStatusColor()}`}>
        <CardHeader>
          <CardTitle>Status Atual do Servidor</CardTitle>
          <CardDescription>Visualização que os clientes veem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div>
              <h3 className="text-2xl font-bold capitalize">{status}</h3>
              <p className="text-sm text-muted-foreground">
                Atualizado: {serverStatus ? new Date(serverStatus.updated_at).toLocaleString('pt-BR') : '-'}
              </p>
            </div>
          </div>
          {message && (
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Atualizar Status</CardTitle>
          <CardDescription>Configure o status e mensagem do servidor</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>Status do Servidor</Label>
              <RadioGroup value={status} onValueChange={setStatus}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-green-200 bg-green-50/50">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Online - Servidor operando normalmente</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50/50">
                  <RadioGroupItem value="warning" id="warning" />
                  <Label htmlFor="warning" className="flex items-center gap-2 cursor-pointer flex-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span>Aviso - Possíveis instabilidades</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-red-200 bg-red-50/50">
                  <RadioGroupItem value="offline" id="offline" />
                  <Label htmlFor="offline" className="flex items-center gap-2 cursor-pointer flex-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Offline - Servidor em manutenção</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Digite uma mensagem adicional para os clientes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Esta mensagem aparecerá no aplicativo do cliente junto com o status
              </p>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
              Atualizar Status
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
