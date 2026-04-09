import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Loader2 } from 'lucide-react';
import { useJobQuestions, useUpsertJobQuestions, JobQuestion } from '@/hooks/useJobQuestions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';

interface QuestionDraft {
  question_text: string;
  question_type: 'text' | 'multiple_choice';
  options: string[];
  required: boolean;
}

export default function QuestionnaireBuilder() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: existingQuestions, isLoading } = useJobQuestions(jobId);
  const upsert = useUpsertJobQuestions(jobId!);

  const { data: job } = useQuery({
    queryKey: ['job-title', jobId],
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('title').eq('id', jobId!).single();
      return data;
    },
    enabled: !!jobId,
  });

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      setQuestions(existingQuestions.map(q => ({
        question_text: q.question_text,
        question_type: q.question_type as 'text' | 'multiple_choice',
        options: (q.options as string[]) || [],
        required: q.required,
      })));
    }
  }, [existingQuestions]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '',
      question_type: 'text',
      options: [],
      required: true,
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const addOption = (qIndex: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIndex ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIndex ? { ...q, options: q.options.filter((_, oi) => oi !== oIndex) } : q));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const newOpts = [...q.options];
      newOpts[oIndex] = value;
      return { ...q, options: newOpts };
    }));
  };

  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return;
    setQuestions(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleSave = async () => {
    const valid = questions.filter(q => q.question_text.trim());
    if (valid.length === 0 && questions.length > 0) {
      toast.error('Preencha o texto de pelo menos uma pergunta');
      return;
    }

    try {
      await upsert.mutateAsync(valid.map((q, i) => ({
        job_id: jobId!,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: q.question_type === 'multiple_choice' ? q.options.filter(o => o.trim()) : null,
        position: i,
        required: q.required,
      })));
      toast.success('Questionário salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar questionário');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={`Questionário — ${job?.title || 'Vaga'}`}
            description="Crie perguntas que os candidatos responderão ao se candidatar pelo portal."
          />
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <Card key={qIndex}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 mt-2">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={qIndex === 0}
                    onClick={() => moveQuestion(qIndex, qIndex - 1)}
                  >▲</button>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={qIndex === questions.length - 1}
                    onClick={() => moveQuestion(qIndex, qIndex + 1)}
                  >▼</button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">#{qIndex + 1}</span>
                    <Input
                      value={q.question_text}
                      onChange={e => updateQuestion(qIndex, { question_text: e.target.value })}
                      placeholder="Texto da pergunta..."
                      className="flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Tipo:</Label>
                      <Select
                        value={q.question_type}
                        onValueChange={(v: 'text' | 'multiple_choice') => {
                          updateQuestion(qIndex, { 
                            question_type: v,
                            options: v === 'multiple_choice' && q.options.length === 0 ? ['', ''] : q.options,
                          });
                        }}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto Livre</SelectItem>
                          <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.required}
                        onCheckedChange={v => updateQuestion(qIndex, { required: v })}
                        id={`req-${qIndex}`}
                      />
                      <Label htmlFor={`req-${qIndex}`} className="text-xs">Obrigatória</Label>
                    </div>
                  </div>

                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      <Label className="text-xs text-muted-foreground">Opções:</Label>
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <Input
                            value={opt}
                            onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Opção ${oIndex + 1}`}
                            className="h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addOption(qIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Opção
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeQuestion(qIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Pergunta
        </Button>
      </div>

      {questions.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">Preview</h3>
            <Card>
              <CardContent className="pt-4 space-y-4">
                {questions.filter(q => q.question_text.trim()).map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <Label className="text-sm">
                      {q.question_text} {q.required && <span className="text-destructive">*</span>}
                    </Label>
                    {q.question_type === 'text' ? (
                      <Input disabled placeholder="Resposta do candidato..." className="bg-muted/50" />
                    ) : (
                      <div className="space-y-1 pl-2">
                        {q.options.filter(o => o.trim()).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2 text-sm">
                            <div className="w-4 h-4 rounded-full border border-input" />
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
