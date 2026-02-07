'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { supabase, type PaymentInfo } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, QrCode } from 'lucide-react'

export default function PaymentManagement() {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [pixLink, setPixLink] = useState('')
  const [pixKey, setPixKey] = useState('')

  useEffect(() => {
    loadPaymentInfo()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('payment_info_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_info' }, () => {
        loadPaymentInfo()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadPaymentInfo = async () => {
    const { data } = await supabase
      .from('payment_info')
      .select('*')
      .single()

    if (data) {
      setPaymentInfo(data)
      setPixLink(data.pix_link || '')
      setPixKey(data.pix_key || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (paymentInfo) {
      await supabase
        .from('payment_info')
        .update({
          pix_link: pixLink,
          pix_key: pixKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentInfo.id)
    }

    loadPaymentInfo()
    alert('Informações de pagamento atualizadas!')
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Pagamento</CardTitle>
          <CardDescription>Atualize as informações de pagamento PIX</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pix_link" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Link do PIX
              </Label>
              <Input
                id="pix_link"
                type="url"
                placeholder="https://exemplo.com/pix/pagamento"
                value={pixLink}
                onChange={(e) => setPixLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Link para página de pagamento ou QR code PIX
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix_key" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Chave PIX
              </Label>
              <Input
                id="pix_key"
                placeholder="email@exemplo.com ou telefone"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Email, telefone, CPF/CNPJ ou chave aleatória
              </p>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
              Salvar Informações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-gradient-to-br from-cyan-50 to-blue-50">
        <CardHeader>
          <CardTitle>Prévia - Visão do Cliente</CardTitle>
          <CardDescription>Como as informações aparecerão no app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pixLink || pixKey ? (
            <>
              {pixKey && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">Chave PIX:</p>
                  <p className="font-mono font-medium text-cyan-700">{pixKey}</p>
                </div>
              )}
              {pixLink && (
                <Button
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  asChild
                >
                  <a href={pixLink} target="_blank" rel="noopener noreferrer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar Mensalidade via PIX
                  </a>
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma informação de pagamento configurada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
