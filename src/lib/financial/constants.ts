// Constantes compartilhadas do módulo financeiro
export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

export const MONTHS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const MONTHS_OPTIONS = [
  { value: 'all', label: 'Todos os meses' },
  ...MONTHS_LONG.map((label, i) => ({ value: String(i), label })),
];

// Paleta consistente para gráficos (HSL via CSS variable não funciona em recharts)
export const CHART_COLORS = [
  'hsl(189, 95%, 38%)',  // primary cyan
  'hsl(142, 71%, 45%)',  // success green
  'hsl(38, 92%, 50%)',   // warning amber
  'hsl(0, 72%, 50%)',    // destructive red
  'hsl(262, 52%, 47%)',  // purple
  'hsl(210, 40%, 50%)',  // blue
  'hsl(330, 60%, 50%)',  // pink
  'hsl(170, 60%, 40%)',  // teal
  'hsl(45, 90%, 55%)',   // gold
  'hsl(280, 60%, 60%)',  // violet
];

export const TIPO_OPTIONS = [
  { value: 'receita', label: 'Receita', prefix: '1', color: 'success' },
  { value: 'deducao', label: 'Dedução', prefix: '2', color: 'warning' },
  { value: 'custo', label: 'Custo', prefix: '3', color: 'orange' },
  { value: 'despesa', label: 'Despesa', prefix: '4', color: 'destructive' },
] as const;

export const FORMA_PAGAMENTO_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'debito_automatico', label: 'Débito Automático' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'warning' },
  { value: 'pago', label: 'Pago', color: 'success' },
  { value: 'cancelado', label: 'Cancelado', color: 'muted' },
] as const;

// Alíquota Simples Nacional padrão para DRE
export const SIMPLES_NACIONAL_RATE = 0.07;
