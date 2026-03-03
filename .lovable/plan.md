

# Otimização Mobile do RecruitCRM

## Problemas Identificados

1. **TopNav**: Barra fixa com tabs lado a lado — não cabe em telas pequenas
2. **AppSidebar**: Sempre visível com `w-56`, ocupa espaço demais no mobile
3. **Conteúdo das páginas**: Grids e tabelas sem breakpoints responsivos (ex: `grid-cols-4` fixo no Dashboard)
4. **Kanban/Tabelas**: Overflow horizontal sem tratamento adequado

## Plano de Implementação

### 1. TopNav responsiva
- No mobile (< 768px): esconder os tabs textuais, mostrar um **hamburger menu** que abre um drawer/sheet com a navegação completa (tabs + itens da sidebar combinados)
- Manter logo + botão de menu hambúrguer na barra superior

### 2. Sidebar colapsável no mobile
- No mobile: sidebar **escondida por padrão**, acessível via o menu hambúrguer do TopNav
- Usar um `Sheet` (drawer lateral) que abre por cima do conteúdo
- No desktop: comportamento atual mantido

### 3. AppLayout responsivo
- Usar o hook `useIsMobile()` já existente para alternar entre layout desktop (sidebar fixa) e mobile (drawer)
- No mobile, o `<main>` ocupa 100% da largura

### 4. Páginas com grids responsivos
- Dashboard: `grid-cols-2 md:grid-cols-4` nos stat cards
- Vagas/JobCard: layout de lista vertical no mobile
- Tabelas: scroll horizontal com `overflow-x-auto`

### Arquivos a modificar:
1. **`src/components/layout/AppLayout.tsx`** — Layout condicional mobile/desktop
2. **`src/components/layout/TopNav.tsx`** — Hamburger menu no mobile, drawer com navegação
3. **`src/components/layout/AppSidebar.tsx`** — Suporte a modo drawer no mobile
4. **`src/pages/Dashboard.tsx`** — Grids responsivos nos stat cards e charts
5. **`src/pages/Vagas.tsx`** — Layout responsivo para cards de vagas

