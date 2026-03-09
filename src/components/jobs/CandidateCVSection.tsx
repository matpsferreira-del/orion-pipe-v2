import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Briefcase, GraduationCap, Sparkles, Clock } from 'lucide-react';
import { usePartyCVData } from '@/hooks/usePartyCVData';
import { Skeleton } from '@/components/ui/skeleton';

interface CandidateCVSectionProps {
  partyId: string | undefined;
}

export function CandidateCVSection({ partyId }: CandidateCVSectionProps) {
  const { experiences, skills, education, summary, isLoading } = usePartyCVData(partyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  const hasData = experiences.length > 0 || skills.length > 0 || education.length > 0 || summary?.parsed_summary;

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhum dado de CV disponível para este candidato.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary & Years */}
      {(summary?.parsed_summary || summary?.total_exp_years) && (
        <div className="space-y-2">
          {summary.total_exp_years && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{summary.total_exp_years} anos de experiência</span>
            </div>
          )}
          {summary.parsed_summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary.parsed_summary}
            </p>
          )}
        </div>
      )}

      {/* Experiences */}
      {experiences.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Experiências</h4>
          </div>
          <div className="space-y-3 pl-6">
            {experiences.map((exp) => (
              <div key={exp.id} className="space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{exp.role || 'Cargo não informado'}</p>
                    <p className="text-xs text-muted-foreground">{exp.company || 'Empresa não informada'}</p>
                  </div>
                  {exp.is_current && (
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                      Atual
                    </Badge>
                  )}
                </div>
                {(exp.start_date || exp.end_date) && (
                  <p className="text-xs text-muted-foreground">
                    {exp.start_date || '?'} — {exp.is_current ? 'Atual' : (exp.end_date || '?')}
                  </p>
                )}
                {exp.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Formação</h4>
            </div>
            <div className="space-y-2 pl-6">
              {education.map((edu) => (
                <div key={edu.id} className="space-y-0.5">
                  <p className="text-sm font-medium">{edu.field_of_study || edu.degree || 'Curso não informado'}</p>
                  <p className="text-xs text-muted-foreground">{edu.institution || 'Instituição não informada'}</p>
                  {edu.degree && edu.field_of_study && (
                    <p className="text-xs text-muted-foreground">{edu.degree}</p>
                  )}
                  {(edu.start_date || edu.end_date) && (
                    <p className="text-xs text-muted-foreground">
                      {edu.start_date || ''} {edu.start_date && edu.end_date ? '—' : ''} {edu.end_date || ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Competências</h4>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-6">
              {skills.map((s) => (
                <Badge key={s.id} variant="secondary" className="text-xs">
                  {s.skill}
                  {s.level && <span className="ml-1 opacity-60">· {s.level}</span>}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
