

# Auto-gerar Nome da Instância Evolution API

Concordo 100% — é muito mais prático e seguro gerar o nome automaticamente. Evita duplicatas, erros de digitação e simplifica o fluxo para o assinante.

## Abordagem

Remover o campo de input "Nome da Instância" e gerar automaticamente no formato:

```text
scalaninja_<6 primeiros chars do user.id>
```

Exemplo: `scalaninja_a3f2b1`

Isso garante unicidade (UUID do usuário é único) e o assinante não precisa pensar em nomes.

## Mudanças no `src/components/whatsapp/EvolutionTab.tsx`

1. **Remover** o input de `instanceName` e seu estado manual
2. **Gerar automaticamente** o nome no `useEffect` quando o user carrega:
   ```typescript
   const generatedName = `scalaninja_${user.id.substring(0, 8)}`;
   setInstanceName(generatedName);
   ```
3. **Na UI desconectada**: mostrar apenas o botão "Criar Instância e Conectar" com texto informativo abaixo: _"Sua instância será criada automaticamente como `scalaninja_XXXXXXXX`"_
4. **Remover** o bloco de formulário com label "Nome da Instância" e o input
5. **Manter** o nome visível na tela de "conectado" como informação (read-only)

## UI resultante

**Desconectado:**
```text
⚠️ Atenção — API Não Oficial...

● DESCONECTADO    [API Ativa]

Sua instância: scalaninja_a3f2b1c4

[⚡ Criar Instância e Conectar]
```

**Conectado:**
```text
● CONECTADO    [API Ativa]

✅ Conexão ativa — Evolution API
Número: +5511999...    Instância: scalaninja_a3f2b1c4
[Testar envio] [Reiniciar] [Desconectar]
```

## Arquivo alterado

| Arquivo | Ação |
|---------|------|
| `src/components/whatsapp/EvolutionTab.tsx` | Remover input manual, auto-gerar nome com `user.id` |

