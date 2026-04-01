

# Simplificar EvolutionTab — Credenciais Globais, Usuário Só Cria Instância

## Problema
A aba Evolution API pede URL do servidor e API Key ao usuário/assinante. Porém, essas credenciais são **globais da plataforma**, configuradas pelo admin em `/admin/integracoes`. O tenant só precisa criar uma instância e escanear o QR Code.

## Solução

### 1. Remover campos de credenciais do EvolutionTab
- Remover inputs de "URL do Servidor Evolution" e "API Key Global"
- Remover estados `serverUrl`, `apiKeyGlobal`, `showApiKey`
- Manter apenas o campo "Nome da Instância"
- Botão "Criar Instância e Conectar" depende apenas do nome preenchido

### 2. Verificar disponibilidade da API global
- No `useEffect`, buscar `system_config` com keys `integration_evolution_url` e `integration_evolution_api_key`
- Se ambas estiverem preenchidas → mostrar formulário com campo de instância + botão
- Se não configuradas → mostrar aviso: "Evolution API não configurada pelo administrador"
- Mostrar badge "API Ativa" / "API Inativa" baseado na configuração global

### 3. Usar credenciais globais server-side
- O `handleCreateInstance` passa apenas `instanceName` e `userId` para uma edge function
- A edge function busca as credenciais globais da `system_config` e chama a Evolution API
- Credenciais nunca expostas ao frontend do tenant

### 4. Atualizar disclaimer
- Simplificar instruções do InfoTooltip (remover passos sobre servidor/API key)
- Manter aviso de API não oficial

### Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/components/whatsapp/EvolutionTab.tsx` | Reescrever: remover campos de credenciais, buscar config global, simplificar UI |

### UI resultante (estado desconectado)
```text
┌─ Atenção — API Não Oficial ─────────────────┐
│ ⚠️ Aviso sobre risco de banimento...         │
└──────────────────────────────────────────────┘

● DESCONECTADO    [🟢 API Ativa] ou [🔴 API Inativa]

Nome da Instância: [minha_loja_________]
  Nome único para identificar esta conexão

[⚡ Criar Instância e Conectar]
```

### UI resultante (estado conectado)
```text
● CONECTADO    [🟢 API Ativa]

┌─ ✅ Conexão ativa — Evolution API ──────────┐
│ Número: +5511999...    Instância: minha_loja │
│ [Testar envio] [Reiniciar] [Desconectar]    │
└──────────────────────────────────────────────┘
```

