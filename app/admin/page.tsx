'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, AlertCircle } from 'lucide-react'

const MASTER_PASSWORD = 'Admin192'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (password === MASTER_PASSWORD) {
      // Store admin authentication
      sessionStorage.setItem('admin_authenticated', 'true')
      router.push('/admin/dashboard')
    } else {
      setError('Senha incorreta. Tente novamente.')
      setPassword('')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 p-3 sm:p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-3 sm:space-y-4 text-center pb-6 sm:pb-8">
          <div className="flex justify-center mb-1 sm:mb-2">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <Image
                src="/novaplay-logo.png"
                alt="NovaPlay Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Painel Admin
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1.5 sm:mt-2">
              Área do Administrador
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha Mestre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha mestre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Acessar Painel'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="w-full text-muted-foreground hover:text-foreground"
              type="button"
            >
              Voltar para Área do Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
