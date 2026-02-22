

## Tornar icones de LinkedIn e Telefone clicaveis nos cards de candidatos do Kanban

### Problema
Nos cards de candidatos no quadro Kanban (pagina de Vagas), os icones de LinkedIn, Telefone e Email sao apenas indicadores visuais estaticos. O usuario quer que sejam clicaveis diretamente no card, sem precisar abrir o detalhe do candidato. O icone do telefone deve abrir o WhatsApp Web.

### Solucao
Transformar os icones de Phone e LinkedIn em links clicaveis (`<a>`) com `e.stopPropagation()` para nao disparar o onClick do card.

- **LinkedIn**: abre `party.linkedin_url` em nova aba
- **Telefone**: abre `https://wa.me/{numero}` (WhatsApp Web), limpando caracteres nao numericos do telefone (usa `phone_e164` se disponivel, senao `phone_raw`)
- Ao passar o mouse, os icones mudam de cor (hover) para indicar que sao clicaveis

### Detalhes tecnicos
- **Arquivo**: `src/components/jobs/CandidateKanban.tsx`
- **Linhas 188-196**: Substituir os `<Mail>`, `<Phone>` e `<Linkedin>` simples por elementos `<a>` com:
  - `href` apropriado para cada tipo
  - `target="_blank"` e `rel="noopener noreferrer"` para links externos
  - `onClick={(e) => e.stopPropagation()}` para evitar abrir o detalhe do candidato
  - Classes de hover: `hover:text-green-500` (WhatsApp), `hover:text-blue-500` (LinkedIn)
- Para o WhatsApp, formatar o numero removendo tudo que nao e digito: `phone_e164?.replace(/\D/g, '') || phone_raw?.replace(/\D/g, '')`
- O icone de Email permanece apenas visual (sem link clicavel), ou opcionalmente abre `mailto:`
