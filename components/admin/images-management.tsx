'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { supabase, type Image as ImageType } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ImagePlusIcon as ImageLucide } from 'lucide-react'
import Image from 'next/image'

export default function ImagesManagement() {
  const [images, setImages] = useState<ImageType[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    title: ''
  })
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadImages()
    
    const channel = supabase
      .channel('images_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'images' }, () => {
        loadImages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB')
      return
    }

    setSelectedFile(file)
    setIsUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error('Resposta inválida do servidor')
      }

      const data = await response.json()

      if (data.success && data.url) {
        setFormData({ ...formData, url: data.url })
      } else {
        throw new Error(data.details || data.error || 'Upload falhou')
      }
    } catch (error: any) {
      alert(`Erro ao fazer upload da imagem: ${error.message}`)
      setSelectedFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.url) {
      alert('Por favor, faça upload de uma imagem ou insira uma URL')
      return
    }

    const maxOrder = images.length > 0 ? Math.max(...images.map(img => img.display_order)) : 0

    await supabase
      .from('images')
      .insert([{
        ...formData,
        display_order: maxOrder + 1
      }])

    resetForm()
    loadImages()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta imagem? Ela será removida permanentemente.')) {
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', id)
      
      if (!error) {
        alert('Imagem excluída com sucesso!')
        loadImages()
      } else {
        alert('Erro ao excluir imagem')
      }
    }
  }

  const resetForm = () => {
    setFormData({ url: '', title: '' })
    setSelectedFile(null)
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Imagens</CardTitle>
            <CardDescription>Adicione imagens que aparecerão no aplicativo do cliente</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={() => resetForm()}>
                <Plus className="h-4 w-4" />
                Nova Imagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Imagem</DialogTitle>
                <DialogDescription>
                  Insira a URL da imagem e um título opcional
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Upload de Imagem (Horizontal Recomendado)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <p className="text-xs text-cyan-600">Fazendo upload...</p>
                  )}
                  {selectedFile && !isUploading && (
                    <p className="text-xs text-green-600">✓ {selectedFile.name} enviado com sucesso</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Prefira imagens em formato horizontal (landscape) 16:9
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou insira uma URL
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL da Imagem</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título (opcional)</Label>
                  <Input
                    id="title"
                    placeholder="Descrição da imagem"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageLucide className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma imagem cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-video relative rounded-lg overflow-hidden border bg-muted">
                  <Image
                    src={image.url || "/placeholder.svg"}
                    alt={image.title || 'Imagem'}
                    fill
                    className="object-cover"
                  />
                </div>
                {image.title && (
                  <p className="text-sm mt-2 truncate">{image.title}</p>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(image.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
