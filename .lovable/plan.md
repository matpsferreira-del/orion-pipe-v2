

## Integração Gmail API para Envio de Emails pela Plataforma

### Contexto

Atualmente, todos os pontos de envio de email na plataforma usam `mailto:`, que abre o cliente de email local. O objetivo é substituir isso por envio direto via Gmail API (OAuth), permitindo emails individuais, em massa, para clientes e com templates -- tudo sem sair da plataforma.

### Arquitetura

```text
┌─────────────────────────────────────────────────┐
│  Frontend (React)                                │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ ComposeEmail  │  │ EmailTemplatesManager    │  │
│  │ Dialog        │  │ (CRUD de templates)      │  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                      │                  │
│         ▼                      ▼                  │
│  ┌─────────────────────────────────────────────┐  │
│  │  supabase.functions.invoke('send-gmail')    │  │
│  └──────────────────┬──────────────────────────┘  │
└─────────────────────┼────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  Edge Function: send-gmail                       │
│  - Lê tokens OAuth do banco                      │
│  - Envia via Gmail API (googleapis.com)          │
│  - Loga envio na tabela email_log                │
└──────────────────┬──────────────────────────────┘
                   ▼
          Gmail API (Google)
```

### Etapas de Implementação

**1. Configuração Google Cloud (ação do usuário)**
- Criar projeto no Google Cloud Console
- Ativar Gmail API
- Criar credenciais OAuth 2.0 (Web Application)
- Configurar redirect URI para a Edge Function de callback
- Fornecer Client ID e Client Secret como secrets do projeto

**2. Tabelas no banco**
- `email_templates` -- templates reutilizáveis (nome, assunto, corpo HTML, variáveis)
- `gmail_tokens` -- armazena access_token e refresh_token por user_id (encriptado)
- `email_log` -- log de emails enviados (remetente, destinatário, assunto, status, timestamp)

**3. Edge Functions**
- `gmail-auth` -- Inicia fluxo OAuth, recebe callback e armazena tokens
- `send-gmail` -- Recebe destinatários, assunto, corpo; usa tokens para enviar via Gmail API; loga resultado

**4. Componentes Frontend**
- `ComposeEmailDialog` -- Dialog com campos Para, Assunto, Corpo (rich text simples), seletor de template, suporte a variáveis dinâmicas ({nome_candidato}, {cargo}, etc.)
- `EmailTemplatesPage` ou seção em Configurações -- CRUD de templates de email
- `GmailConnectButton` -- Botão em Configurações para conectar conta Gmail via OAuth

**5. Integração nos pontos existentes**
- Substituir todos os `mailto:` por abertura do `ComposeEmailDialog`
- `BulkActionBar` -- botão "Enviar Email" abre dialog com múltiplos destinatários
- `CandidateDetailDialog` -- ícone de email abre dialog pré-preenchido
- `Contatos` -- link de email abre dialog
- `PartyDetailDialog` -- link de email abre dialog

**6. Templates pré-definidos sugeridos**
- Convite para entrevista
- Feedback de processo (aprovação/reprovação)
- Solicitação de documentos
- Follow-up com cliente
- Proposta comercial

### Pré-requisitos do Usuário
Antes de iniciar, será necessário:
1. Criar um projeto no Google Cloud Console e ativar a Gmail API
2. Gerar credenciais OAuth 2.0 (Client ID + Client Secret)
3. Adicionar esses valores como secrets no projeto

### Observações
- Os tokens OAuth do Gmail incluem refresh_token para renovação automática
- O envio em massa respeitará rate limits do Gmail (máx. ~100 emails/dia para contas normais, ~2000 para Workspace)
- Todos os envios serão logados para auditoria

