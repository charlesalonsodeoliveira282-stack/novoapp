'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { User, Lock, AlertCircle, Fingerprint } from 'lucide-react'

export default function ClientLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user already has active session
    const clientId = localStorage.getItem('novaplay_client_id')
    const clientAuth = localStorage.getItem('novaplay_client_auth')
    
    if (clientId && clientAuth === 'true') {
      // Verify if session is still valid by checking if client exists and is active
      const verifySession = async () => {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('is_active', true)
          .single()

        if (client) {
          // Session is valid, redirect to dashboard
          sessionStorage.setItem('client_id', client.id)
          sessionStorage.setItem('client_authenticated', 'true')
          router.push('/dashboard')
          return
        } else {
          // Session invalid, clear storage
          localStorage.removeItem('novaplay_client_id')
          localStorage.removeItem('novaplay_client_username')
          localStorage.removeItem('novaplay_client_auth')
          localStorage.removeItem('novaplay_client_login_time')
        }
      }
      verifySession()
    }

    // Check if credentials are saved
    const savedUsername = localStorage.getItem('novaplay_username')
    const savedPassword = localStorage.getItem('novaplay_password')
    
    if (savedUsername && savedPassword) {
      setUsername(savedUsername)
      setPassword(savedPassword)
      setRememberMe(true)
    }

    // Check if biometric authentication is available
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      setBiometricAvailable(true)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Query database for matching client
    const { data: clients, error: queryError } = await supabase
      .from('clients')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', true)
      .single()

    if (queryError || !clients) {
      setError('Usuário ou senha incorretos, ou conta inativa.')
      setIsLoading(false)
      return
    }

    // Check if account is expired
    if (clients.expiration_date) {
      const expDate = new Date(clients.expiration_date)
      const now = new Date()
      if (expDate < now) {
        setError('Sua assinatura expirou. Entre em contato para renovar.')
        setIsLoading(false)
        return
      }
    }

    // Save credentials if remember me is checked
    if (rememberMe) {
      localStorage.setItem('novaplay_username', username)
      localStorage.setItem('novaplay_password', password)
    } else {
      localStorage.removeItem('novaplay_username')
      localStorage.removeItem('novaplay_password')
    }

    // Store client info in localStorage (persiste entre fechamentos do navegador)
    localStorage.setItem('novaplay_client_id', clients.id)
    localStorage.setItem('novaplay_client_username', clients.username)
    localStorage.setItem('novaplay_client_auth', 'true')
    localStorage.setItem('novaplay_client_login_time', new Date().toISOString())
    
    // Também mantém no sessionStorage para compatibilidade
    sessionStorage.setItem('client_id', clients.id)
    sessionStorage.setItem('client_authenticated', 'true')
    
    router.push('/dashboard')
    setIsLoading(false)
  }

  const handleBiometricLogin = async () => {
    setError('')
    
    if (!biometricAvailable) {
      setError('Autenticação biométrica não disponível neste dispositivo')
      return
    }

    const savedUsername = localStorage.getItem('novaplay_username')
    const savedPassword = localStorage.getItem('novaplay_password')

    if (!savedUsername || !savedPassword) {
      setError('Nenhuma credencial salva. Faça login com usuário e senha primeiro.')
      return
    }

    setIsLoading(true)

    try {
      // Simulate biometric authentication
      // In production, use WebAuthn API
      const authenticated = await new Promise((resolve) => {
        setTimeout(() => resolve(true), 1000)
      })

      if (authenticated) {
        setUsername(savedUsername)
        setPassword(savedPassword)
        
        // Auto submit
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .eq('username', savedUsername)
          .eq('password', savedPassword)
          .eq('is_active', true)
          .single()

        if (clients) {
          // Store in both localStorage and sessionStorage
          localStorage.setItem('novaplay_client_id', clients.id)
          localStorage.setItem('novaplay_client_username', clients.username)
          localStorage.setItem('novaplay_client_auth', 'true')
          localStorage.setItem('novaplay_client_login_time', new Date().toISOString())
          
          sessionStorage.setItem('client_id', clients.id)
          sessionStorage.setItem('client_authenticated', 'true')
          router.push('/dashboard')
        } else {
          setError('Credenciais salvas inválidas')
        }
      }
    } catch (err) {
      setError('Falha na autenticação biométrica')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 p-3 sm:p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-3 sm:space-y-4 text-center pb-6 sm:pb-8">
          <div className="flex justify-center mb-1 sm:mb-2">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
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
              Bem-vindo ao NovaPlay
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1.5 sm:mt-2">
              Área do Cliente
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Lembrar minhas credenciais
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Entrar'}
              </Button>

              {/* Biometric login removed from UI but functionality remains for future use */}
              {false && biometricAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 gap-2 bg-transparent"
                  onClick={handleBiometricLogin}
                  disabled={isLoading}
                >
                  <Fingerprint className="h-5 w-5" />
                  Entrar com Biometria
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Precisa de ajuda?</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <a
                  href="https://wa.me/5541991163356"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  WhatsApp
                </a>
                <span>•</span>
                <a
                  href="mailto:suporte.novaplay@gmail.com"
                  className="text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  Email
                </a>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin')}
                className="w-full text-muted-foreground hover:text-foreground"
                type="button"
              >
                Acessar Painel Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
