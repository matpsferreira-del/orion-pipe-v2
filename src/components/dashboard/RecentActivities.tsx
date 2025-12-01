import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityRow } from '@/hooks/useActivities';
import { ProfileRow } from '@/hooks/useProfiles';
import { CompanyRow } from '@/hooks/useCompanies';
import { Phone, Video, Mail, MessageSquare, FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityType = 'ligacao' | 'reuniao' | 'email' | 'followup' | 'proposta' | 'outro';

const activityIcons: Record<ActivityType, React.ElementType> = {
  ligacao: Phone,
  reuniao: Video,
  email: Mail,
  followup: MessageSquare,
  proposta: FileText,
  outro: MoreHorizontal,
};

const activityColors: Record<ActivityType, string> = {
  ligacao: 'bg-success/10 text-success',
  reuniao: 'bg-primary/10 text-primary',
  email: 'bg-accent/10 text-accent',
  followup: 'bg-warning/10 text-warning',
  proposta: 'bg-purple-500/10 text-purple-500',
  outro: 'bg-muted text-muted-foreground',
};

interface RecentActivitiesProps {
  activities: ActivityRow[];
  profiles: ProfileRow[];
  companies: CompanyRow[];
}

export function RecentActivities({ activities, profiles, companies }: RecentActivitiesProps) {
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  const formatDate = (date: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.nome_fantasia || 'Empresa não encontrada';
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || 'Usuário';
  };

  if (recentActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Nenhuma atividade registrada
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => {
            const activityType = (activity.type as ActivityType) || 'outro';
            const Icon = activityIcons[activityType] || activityIcons.outro;
            const colorClass = activityColors[activityType] || activityColors.outro;
            
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getCompanyName(activity.company_id)} • {getUserName(activity.user_id)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(activity.data)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
