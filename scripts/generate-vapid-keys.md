# Gerar Chaves VAPID para Notificações Push

Para habilitar as notificações push que funcionam mesmo com o app fechado, você precisa gerar chaves VAPID (Voluntary Application Server Identification).

## Passo 1: Instalar dependências

```bash
npm install
```

## Passo 2: Gerar as chaves VAPID

Execute o comando:

```bash
npx web-push generate-vapid-keys
```

Você receberá uma saída como esta:

```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls

=======================================
```

## Passo 3: Adicionar as variáveis de ambiente

No painel do Vercel ou na seção "Vars" do v0:

1. **NEXT_PUBLIC_VAPID_PUBLIC_KEY** (pública - usada no navegador)
   - Valor: A chave pública gerada (ex: BEl62iUYgUivxIkv...)

2. **VAPID_PRIVATE_KEY** (privada - usada apenas no servidor)
   - Valor: A chave privada gerada (ex: UUxI4O8-FbRouAevSmBQ...)

## Passo 4: Reiniciar o servidor

Após adicionar as variáveis, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Como funciona?

- A chave **pública** é enviada ao navegador para se inscrever em notificações push
- A chave **privada** fica no servidor e é usada para assinar e enviar as notificações
- As notificações chegam mesmo com o app fechado ou tela bloqueada no celular
- Funciona em todos os navegadores modernos (Chrome, Firefox, Edge, Safari)

## Testando

1. Acesse o dashboard do cliente (/dashboard)
2. Permita notificações quando solicitado
3. Vá ao painel admin (/admin) e envie uma notificação
4. Feche o navegador/app - a notificação ainda aparecerá!
