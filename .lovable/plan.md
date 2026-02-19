
## Adicionar "Nova Oportunidade" no menu de três pontinhos das Empresas

### Contexto atual

Na página de Empresas (`src/pages/Empresas.tsx`), o menu dropdown de cada linha da tabela (botão `MoreHorizontal`) tem três opções:
- Ver detalhes
- Editar
- Excluir

O `OpportunityDialog` já existe em `src/components/opportunities/OpportunityDialog.tsx`, mas aceita apenas `{ open, onOpenChange }` — sem suporte para receber uma empresa pré-selecionada.

### O que será feito

**1. Atualizar `OpportunityDialog` para aceitar `companyId` pré-definido**

Adicionar uma prop opcional `defaultCompanyId` ao componente. Quando fornecida:
- O campo "Empresa" começa preenchido e fica desabilitado (empresa já está definida pelo contexto)
- O campo "Contato" já carrega os contatos dessa empresa automaticamente

```typescript
interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string; // novo
}
```

**2. Adicionar estado e handler em `Empresas.tsx`**

```typescript
const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
const [opportunityCompanyId, setOpportunityCompanyId] = useState<string | null>(null);

const handleNewOpportunity = (company: CompanyRow, e: React.MouseEvent) => {
  e.stopPropagation();
  setOpportunityCompanyId(company.id);
  setOpportunityDialogOpen(true);
};
```

**3. Inserir item no menu dropdown de cada linha**

Adicionado entre "Editar" e "Excluir", com ícone `Target`:

```tsx
<DropdownMenuItem onClick={(e) => handleNewOpportunity(company, e)}>
  <Target className="h-4 w-4 mr-2" />
  Nova Oportunidade
</DropdownMenuItem>
```

O ícone `Target` já está importado na página.

**4. Renderizar o `OpportunityDialog` ao final da página**

```tsx
<OpportunityDialog
  open={opportunityDialogOpen}
  onOpenChange={(open) => {
    setOpportunityDialogOpen(open);
    if (!open) setOpportunityCompanyId(null);
  }}
  defaultCompanyId={opportunityCompanyId ?? undefined}
/>
```

### Arquivos alterados

- `src/components/opportunities/OpportunityDialog.tsx` — nova prop `defaultCompanyId`, campo empresa pré-selecionado e desabilitado quando fornecido
- `src/pages/Empresas.tsx` — novo estado, handler e item no dropdown, renderização do dialog
