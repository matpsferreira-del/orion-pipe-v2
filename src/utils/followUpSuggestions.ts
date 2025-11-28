// Intelligent follow-up suggestion logic based on activity type and CRM best practices

export interface FollowUpSuggestion {
  titulo: string;
  descricao: string;
  diasAposAtividade: number;
  priority: 'baixa' | 'media' | 'alta';
}

// Activity type to follow-up mapping
const followUpRules: Record<string, FollowUpSuggestion[]> = {
  ligacao: [
    {
      titulo: 'Follow-up por email',
      descricao: 'Enviar email de follow-up resumindo pontos da ligação',
      diasAposAtividade: 1,
      priority: 'media',
    },
    {
      titulo: 'Segunda tentativa de contato',
      descricao: 'Ligar novamente para acompanhar interesse',
      diasAposAtividade: 3,
      priority: 'media',
    },
  ],
  reuniao: [
    {
      titulo: 'Enviar ata da reunião',
      descricao: 'Documentar e enviar resumo da reunião com próximos passos',
      diasAposAtividade: 1,
      priority: 'alta',
    },
    {
      titulo: 'Follow-up pós-reunião',
      descricao: 'Verificar se cliente teve dúvidas após análise',
      diasAposAtividade: 3,
      priority: 'media',
    },
    {
      titulo: 'Check-in de progresso',
      descricao: 'Verificar evolução das tratativas',
      diasAposAtividade: 7,
      priority: 'media',
    },
  ],
  email: [
    {
      titulo: 'Follow-up de resposta',
      descricao: 'Verificar se email foi recebido e se há dúvidas',
      diasAposAtividade: 2,
      priority: 'baixa',
    },
    {
      titulo: 'Reenvio ou nova abordagem',
      descricao: 'Tentar nova abordagem caso não tenha obtido resposta',
      diasAposAtividade: 5,
      priority: 'media',
    },
  ],
  proposta: [
    {
      titulo: 'Verificar recebimento da proposta',
      descricao: 'Confirmar que proposta foi recebida e esclarecer dúvidas',
      diasAposAtividade: 1,
      priority: 'alta',
    },
    {
      titulo: 'Follow-up de decisão',
      descricao: 'Verificar prazo para tomada de decisão',
      diasAposAtividade: 3,
      priority: 'alta',
    },
    {
      titulo: 'Negociação ou ajustes',
      descricao: 'Agendar reunião para negociar termos se necessário',
      diasAposAtividade: 7,
      priority: 'media',
    },
  ],
  followup: [
    {
      titulo: 'Manter relacionamento',
      descricao: 'Follow-up para manter contato aquecido',
      diasAposAtividade: 7,
      priority: 'baixa',
    },
  ],
  outro: [
    {
      titulo: 'Follow-up geral',
      descricao: 'Acompanhar evolução da tratativa',
      diasAposAtividade: 3,
      priority: 'media',
    },
  ],
};

export function getFollowUpSuggestions(activityType: string): FollowUpSuggestion[] {
  return followUpRules[activityType] || followUpRules.outro;
}

export function calculateFollowUpDate(activityDate: Date, daysToAdd: number): Date {
  const followUpDate = new Date(activityDate);
  followUpDate.setDate(followUpDate.getDate() + daysToAdd);
  
  // Se cair no fim de semana, move para segunda-feira
  const dayOfWeek = followUpDate.getDay();
  if (dayOfWeek === 0) {
    followUpDate.setDate(followUpDate.getDate() + 1);
  } else if (dayOfWeek === 6) {
    followUpDate.setDate(followUpDate.getDate() + 2);
  }
  
  return followUpDate;
}

export function generateFollowUpTasks(
  activityType: string,
  activityDate: Date,
  companyId: string,
  opportunityId: string | null,
  userId: string,
  responsavelId: string
) {
  const suggestions = getFollowUpSuggestions(activityType);
  
  return suggestions.map(suggestion => ({
    titulo: suggestion.titulo,
    descricao: suggestion.descricao,
    priority: suggestion.priority,
    status: 'pendente' as const,
    due_date: calculateFollowUpDate(activityDate, suggestion.diasAposAtividade).toISOString(),
    company_id: companyId,
    opportunity_id: opportunityId,
    user_id: userId,
    responsavel_id: responsavelId,
  }));
}
