# Manual Database Update Required

Por favor, execute o seguinte SQL no seu painel Supabase para adicionar a coluna de pontos de fidelidade:

## SQL para executar:

```sql
-- Adicionar coluna de pontos de fidelidade
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Criar comentário na coluna
COMMENT ON COLUMN clients.loyalty_points IS 'Pontos de fidelidade do cliente. 5000 pontos = desconto na mensalidade';
```

## Como executar:

1. Acesse seu painel Supabase
2. Vá em **SQL Editor**
3. Cole o SQL acima
4. Clique em **Run**

Após executar, o sistema de pontos de fidelidade estará totalmente funcional!
