// CRM Types for Recruitment Consulting

export type UserRole = 'admin' | 'gestor' | 'consultor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  teamId?: string;
  createdAt: Date;
}

export type CompanyStatus = 'prospect' | 'cliente_ativo' | 'cliente_inativo';
export type CompanySize = 'micro' | 'pequena' | 'media' | 'grande' | 'enterprise';

export interface Company {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  site?: string;
  segmento: string;
  porte: CompanySize;
  cidade: string;
  estado: string;
  status: CompanyStatus;
  responsavelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  companyId: string;
  nome: string;
  cargo: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  observacoes?: string;
  isPrimary: boolean;
  createdAt: Date;
}

export type PipelineStage = 
  | 'lead_identificado'
  | 'contato_inicial'
  | 'diagnostico_spin'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado_ganhou'
  | 'fechado_perdeu'
  | 'pos_venda';

export type LeadSource = 'indicacao' | 'inbound' | 'outbound' | 'evento' | 'linkedin' | 'outro';
export type ServiceType = 'recrutamento_pontual' | 'programa_recorrente' | 'rpo' | 'hunting' | 'consultoria';

export interface SpinSelling {
  situacao: {
    comoContrata: string;
    timeInterno: string;
  };
  problema: {
    dificuldades: string;
    tempoMedio: string;
  };
  implicacao: {
    impactoNegocios: string;
    perdaReceita: string;
  };
  necessidade: {
    cenarioIdeal: string;
    urgencia: string;
  };
}

export interface Opportunity {
  id: string;
  companyId: string;
  contactId: string;
  responsavelId: string;
  stage: PipelineStage;
  valorPotencial: number;
  probabilidade: number;
  createdAt: Date;
  dataPrevisaoFechamento: Date;
  origemLead: LeadSource;
  tipoServico: ServiceType;
  observacoes?: string;
  spin?: SpinSelling;
}

export type ActivityType = 'ligacao' | 'reuniao' | 'email' | 'followup' | 'proposta' | 'outro';

export interface Activity {
  id: string;
  opportunityId?: string;
  companyId: string;
  userId: string;
  type: ActivityType;
  titulo: string;
  descricao?: string;
  data: Date;
  createdAt: Date;
}

export interface Task {
  id: string;
  opportunityId?: string;
  companyId?: string;
  userId: string;
  responsavelId: string;
  titulo: string;
  descricao?: string;
  dueDate: Date;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  priority: 'baixa' | 'media' | 'alta';
  createdAt: Date;
}

export type InvoiceStatus = 'a_receber' | 'recebido' | 'em_atraso' | 'cancelado';
export type PaymentMethod = 'boleto' | 'pix' | 'transferencia' | 'cartao' | 'outro';

export interface Invoice {
  id: string;
  companyId: string;
  opportunityId?: string;
  numeroNota: string;
  cnpjCliente: string;
  descricaoServico: string;
  valor: number;
  dataEmissao: Date;
  dataVencimento: Date;
  status: InvoiceStatus;
  formaPagamento: PaymentMethod;
  createdAt: Date;
}

// Dashboard types
export interface PipelineMetrics {
  stage: PipelineStage;
  count: number;
  totalValue: number;
}

export interface ConversionRate {
  fromStage: PipelineStage;
  toStage: PipelineStage;
  rate: number;
}

export interface SalesPerformance {
  userId: string;
  userName: string;
  activeOpportunities: number;
  totalValue: number;
  closedDeals: number;
  closedValue: number;
}
