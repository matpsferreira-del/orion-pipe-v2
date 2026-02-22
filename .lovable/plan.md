
## Botao para expandir o painel da vaga

Atualmente, ao clicar em uma vaga, abre um `Sheet` (painel lateral) com largura `sm:max-w-3xl`. O objetivo e adicionar um botao de expandir/recolher para que o painel ocupe a tela inteira.

### Mudancas

**Arquivo: `src/pages/Vagas.tsx`**

1. Adicionar um estado `isExpanded` (boolean, default `false`)
2. No `SheetContent`, alternar a classe de largura:
   - Recolhido: `w-full sm:max-w-3xl`
   - Expandido: `w-full sm:max-w-full`
3. Dentro do `SheetHeader`, ao lado do titulo, adicionar um botao com icone:
   - Quando recolhido: icone `Maximize2` (expandir)
   - Quando expandido: icone `Minimize2` (recolher)
   - Ao clicar, alterna o estado `isExpanded`
4. Resetar `isExpanded` para `false` quando o sheet fechar (no `onOpenChange`)

### Detalhes tecnicos

- Importar `Maximize2` e `Minimize2` de `lucide-react`
- O botao tera estilo `variant="ghost" size="icon"` para ficar discreto
- A transicao de largura usara `transition-all duration-300` para animar suavemente
