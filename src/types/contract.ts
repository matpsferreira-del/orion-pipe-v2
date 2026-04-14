// Contract model types for financial integration

export type ContractModel =
  | 'sucesso_mensal'
  | 'sucesso_anual'
  | 'retainer_mensal'
  | 'retainer_anual'
  | 'rpo'
  | 'outplacement_mentoria'
  | 'outplacement_sem_mentoria';

export type MilestoneType =
  | 'abertura_vaga'
  | 'envio_shortlist'
  | 'finalizacao_vaga'
  | 'inicio_outplacement'
  | 'sucesso_outplacement'
  | 'rpo_ciclo_mensal'
  | 'ajuste_reconciliacao';

export type MilestoneStatus = 'previsto' | 'a_receber' | 'recebido' | 'cancelado';

export type RetainerMarco = 'abertura_vaga' | 'envio_shortlist' | 'finalizacao_vaga';

export interface ContractMilestone {
  id: string;
  job_id: string;
  milestone_type: MilestoneType;
  percentage: number | null;
  valor: number;
  status: MilestoneStatus;
  financial_transaction_id: string | null;
  triggered_at: string | null;
  rpo_cycle_month: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const contractModelLabels: Record<ContractModel, string> = {
  sucesso_mensal: 'Sucesso — Salário Mensal',
  sucesso_anual: 'Sucesso — Salário Anual',
  retainer_mensal: 'Retainer — Salário Mensal',
  retainer_anual: 'Retainer — Salário Anual',
  rpo: 'RPO',
  outplacement_mentoria: 'Outplacement c/ Mentoria',
  outplacement_sem_mentoria: 'Outplacement s/ Mentoria',
};

export const retainerMarcoLabels: Record<RetainerMarco, string> = {
  abertura_vaga: 'Abertura da Vaga',
  envio_shortlist: 'Envio de Shortlist',
  finalizacao_vaga: 'Finalização da Vaga',
};

export const milestoneStatusLabels: Record<MilestoneStatus, string> = {
  previsto: 'Previsto',
  a_receber: 'A Receber',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

export const milestoneStatusColors: Record<MilestoneStatus, string> = {
  previsto: 'bg-muted text-muted-foreground',
  a_receber: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  recebido: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// --- Calculation helpers ---

export function calcTotalMensal(salary: number, bonusAnual: number, feePercent: number): number {
  return (feePercent / 100) * (salary + bonusAnual / 12);
}

export function calcTotalAnual(salary: number, bonusAnual: number, feePercent: number): number {
  return (feePercent / 100) * (salary * 12 + bonusAnual);
}

export function calcTotal(model: ContractModel, salary: number, bonusAnual: number, feePercent: number): number {
  switch (model) {
    case 'sucesso_mensal':
    case 'retainer_mensal':
    case 'outplacement_mentoria':
    case 'outplacement_sem_mentoria':
      return calcTotalMensal(salary, bonusAnual, feePercent);
    case 'sucesso_anual':
    case 'retainer_anual':
      return calcTotalAnual(salary, bonusAnual, feePercent);
    case 'rpo':
      return 0; // RPO uses different calculation
    default:
      return 0;
  }
}

export function needsReconciliation(model: ContractModel): boolean {
  return ['retainer_mensal', 'retainer_anual', 'outplacement_mentoria'].includes(model);
}

export function usesMetaSalary(model: ContractModel): boolean {
  return ['retainer_mensal', 'retainer_anual', 'outplacement_mentoria'].includes(model);
}

export function isRetainer(model: ContractModel): boolean {
  return model === 'retainer_mensal' || model === 'retainer_anual';
}

export function isOutplacement(model: ContractModel): boolean {
  return model === 'outplacement_mentoria' || model === 'outplacement_sem_mentoria';
}
