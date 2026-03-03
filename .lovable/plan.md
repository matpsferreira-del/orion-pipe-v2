

# Otimização Mobile

## Problemas Identificados
1. **Sidebar sempre visível** no mobile, ocupando ~60% da tela e empurrando o conteúdo principal
2. **TopNav com tabs cortadas** — "Recrutamento" e "Configurações" ficam fora da tela
3. **Conteúdo principal espremido** — textos, botões e cards truncados no espaço restante

## Plano

### 1. Sidebar colapsável no mobile (`AppLayout.tsx` + `AppSidebar.tsx`)
- No mobile (`< 768px`), esconder a sidebar por padrão
- Adicionar botão hamburger (☰) no `TopNav` para abrir/fechar a sidebar como overlay (posição absoluta com backdrop)
- Sidebar abre como drawer lateral sobre o conteúdo, fecha ao clicar em um item ou no backdrop
- Usar `useIsMobile()` hook existente

### 2. TopNav responsivo (`TopNav.tsx`)
- No mobile, reduzir padding e tamanho dos botões de tabs
- Esconder o texto do logo ("RecruitCRM"), manter só o ícone
- Adicionar o botão hamburger à esquerda
- Tabs menores com texto compacto

### 3. Páginas com padding responsivo
- Revisar as páginas principais (Dashboard, Vagas, etc.) para usar padding menor no mobile (`p-4` em vez de `p-6`/`p-8`)
- Garantir que grids de cards usem `grid-cols-1` no mobile

### Arquivos modificados:
1. **`src/components/layout/TopNav.tsx`** — Botão hamburger, layout responsivo
2. **`src/components/layout/AppSidebar.tsx`** — Drawer overlay no mobile com backdrop
3. **`src/components/layout/AppLayout.tsx`** — Gerenciar estado aberto/fechado do sidebar mobile
4. **`src/pages/Vagas.tsx`** — Padding responsivo
5. **`src/pages/Dashboard.tsx`** — Padding responsivo

