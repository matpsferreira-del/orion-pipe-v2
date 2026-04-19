// Formatters reutilizáveis do módulo financeiro

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_COMPACT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const BRL_INT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const PCT = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number) => BRL.format(value || 0);
export const formatCurrencyCompact = (value: number) => BRL_COMPACT.format(value || 0);
export const formatCurrencyInt = (value: number) => BRL_INT.format(value || 0);

export const formatPercent = (value: number) => PCT.format(value || 0);

export const formatDateBR = (isoDate: string | null | undefined) => {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};

// Variação percentual entre dois valores
export const calcVariation = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / Math.abs(previous);
};

// Formata variação com sinal
export const formatVariation = (variation: number): string => {
  const sign = variation > 0 ? '+' : '';
  return `${sign}${formatPercent(variation)}`;
};
