import * as XLSX from 'xlsx';
import type {
  OutplacementContact,
  OutplacementMarketJob,
  OutplacementProject,
} from '@/hooks/useOutplacementProjects';
import {
  KANBAN_STAGES,
  TIER_LABELS,
  CONTACT_TYPE_LABELS,
} from '@/hooks/useOutplacementProjects';

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  KANBAN_STAGES.map(s => [s.key, s.label]),
);

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'projeto';
}

function fmt(date?: string | null) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString('pt-BR');
  } catch {
    return date;
  }
}

export function exportProjetoMapeamento(
  project: OutplacementProject,
  contacts: OutplacementContact[],
  jobs: OutplacementMarketJob[],
) {
  const wb = XLSX.utils.book_new();

  // Resumo
  const resumo = [
    ['Projeto', project.title],
    ['Tipo', project.project_type],
    ['Status', project.status],
    ['Cargo Alvo', project.target_role ?? ''],
    ['Indústria Alvo', project.target_industry ?? ''],
    ['Localização Alvo', project.target_location ?? ''],
    ['Cliente (e-mail)', project.client_email ?? ''],
    ['Cliente (telefone)', project.client_phone ?? ''],
    ['Total de Contatos', contacts.length],
    ['Total de Vagas de Mercado', jobs.length],
    ['Exportado em', new Date().toLocaleString('pt-BR')],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo['!cols'] = [{ wch: 24 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Contatos
  const contatosRows = contacts.map(c => ({
    Nome: c.name,
    Cargo: c.current_position ?? '',
    Empresa: c.company_name ?? '',
    Tipo: CONTACT_TYPE_LABELS[c.contact_type] ?? c.contact_type,
    Tier: TIER_LABELS[c.tier] ?? c.tier,
    Etapa: STAGE_LABELS[c.kanban_stage] ?? c.kanban_stage,
    LinkedIn: c.linkedin_url ?? '',
    Email: c.email ?? '',
    Telefone: c.phone ?? '',
    Cidade: c.city ?? '',
    Estado: c.state ?? '',
    Notas: c.notes ?? '',
    'Criado em': fmt(c.created_at),
    'Atualizado em': fmt(c.updated_at),
  }));
  const wsContatos = XLSX.utils.json_to_sheet(
    contatosRows.length ? contatosRows : [{ Nome: '(sem contatos)' }],
  );
  wsContatos['!cols'] = [
    { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 10 },
    { wch: 18 }, { wch: 40 }, { wch: 28 }, { wch: 16 }, { wch: 18 },
    { wch: 8 }, { wch: 40 }, { wch: 18 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsContatos, 'Contatos');

  // Vagas de mercado
  const vagasRows = jobs.map(j => ({
    'Título': j.job_title,
    'Empresa': j.company_name,
    'Localização': j.location ?? '',
    'Status': j.status,
    'Fonte': j.source ?? '',
    'URL': j.job_url ?? '',
    'Aplicada em': fmt(j.applied_at),
    'Notas': j.notes ?? '',
    'Criada em': fmt(j.created_at),
  }));
  const wsVagas = XLSX.utils.json_to_sheet(
    vagasRows.length ? vagasRows : [{ 'Título': '(sem vagas)' }],
  );
  wsVagas['!cols'] = [
    { wch: 32 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 40 }, { wch: 18 }, { wch: 40 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsVagas, 'Vagas de Mercado');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${sanitize(project.title)}_mapeamento_${stamp}.xlsx`);
}
