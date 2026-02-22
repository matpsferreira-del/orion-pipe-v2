

## Remover aba "Cadastrar" da pagina de login

### Problema
A pagina de login (`/auth`) exibe duas abas: "Entrar" e "Cadastrar". Isso da a impressao de que qualquer pessoa pode criar uma conta e acessar o CRM. A criacao de contas deve ser feita exclusivamente por administradores pela pagina de Equipe.

### Solucao
Simplificar a pagina de login removendo o componente de abas (Tabs) e toda a secao de cadastro. A pagina mostrara apenas o formulario de login com email e senha.

### Detalhes tecnicos
- **Arquivo**: `src/pages/Auth.tsx`
- Remover imports de `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- Remover o estado `name` e a funcao `handleSignUp` (e o import de `signUp`)
- Remover toda a estrutura de Tabs, mantendo apenas o formulario de login diretamente no `CardContent`
- Manter o botao "Entrar" e os campos de email/senha como estao

