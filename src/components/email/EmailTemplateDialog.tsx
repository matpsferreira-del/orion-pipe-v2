import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { EmailTemplate, useCreateEmailTemplate, useUpdateEmailTemplate } from '@/hooks/useEmailTemplates';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplate | null;
}

export function EmailTemplateDialog({ open, onOpenChange, template }: Props) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('geral');
  const [variables, setVariables] = useState<string[]>([]);
  const [varInput, setVarInput] = useState('');

  const { profile } = useAuth();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();

  const isEditing = !!template;

  useEffect(() => {
    if (open && template) {
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
      setCategory(template.category);
      setVariables(template.variables || []);
    } else if (open) {
      setName('');
      setSubject('');
      setBody('');
      setCategory('geral');
      setVariables([]);
    }
  }, [open, template]);

  const addVariable = () => {
    const v = varInput.trim().replace(/[{}]/g, '');
    if (v && !variables.includes(v)) {
      setVariables([...variables, v]);
    }
    setVarInput('');
  };

  const handleSave = () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return;

    const payload = {
      name,
      subject,
      body,
      category,
      variables: variables as any,
      created_by: profile?.id || '',
    };

    if (isEditing) {
      updateTemplate.mutate({ id: template.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Convite para Entrevista" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recrutamento">Recrutamento</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assunto</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Convite para Entrevista - {nome_vaga}" />
          </div>

          <div className="space-y-1.5">
            <Label>Corpo do Email (suporta HTML)</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="<p>Olá {nome_candidato},</p>"
              className="min-h-[200px] font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Variáveis Dinâmicas</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {variables.map(v => (
                <Badge key={v} variant="secondary" className="gap-1">
                  {`{${v}}`}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setVariables(variables.filter(x => x !== v))} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={varInput}
                onChange={e => setVarInput(e.target.value)}
                placeholder="nome_candidato"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariable(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Use {'{variavel}'} no assunto e corpo para substituição automática.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
