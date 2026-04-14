import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, DollarSign, AlertCircle, Info } from 'lucide-react';
import { 
  ContractModel, contractModelLabels, retainerMarcoLabels, RetainerMarco,
  calcTotal, isRetainer, isOutplacement, needsReconciliation, usesMetaSalary
} from '@/types/contract';
import { useUpdateJob } from '@/hooks/useJobs';
import { useCreateMilestoneWithTransaction } from '@/hooks/useContractMilestones';
import { toast } from 'sonner';

interface ContractConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  companyName?: string;
}

export function ContractConfigDialog({ open, onOpenChange, job, companyName }: ContractConfigDialogProps) {
  const updateJob = useUpdateJob();
  const createMilestone = useCreateMilestoneWithTransaction();

  // Form state from job data
  const [modelo, setModelo] = useState<ContractModel | ''>((job as any)?.modelo_contrato || '');
  const [salarioMeta, setSalarioMeta] = useState(String((job as any)?.salario_meta || ''));
  const [bonusAnualMeta, setBonusAnualMeta] = useState(String((job as any)?.bonus_anual_meta || '0'));
  const [feePercentual, setFeePercentual] = useState(String((job as any)?.fee_percentual || ''));
  const [garantiaDias, setGarantiaDias] = useState(String((job as any)?.garantia_dias || '90'));

  // Retainer
  const [retainerParcelas, setRetainerParcelas] = useState<'2x' | '3x'>(((job as any)?.retainer_parcelas as '2x' | '3x') || '3x');
  const [retainerMarco1, setRetainerMarco1] = useState<RetainerMarco>(((job as any)?.retainer_marco_1 as RetainerMarco) || 'abertura_vaga');
  const [retainerMarco2, setRetainerMarco2] = useState<RetainerMarco>(((job as any)?.retainer_marco_2 as RetainerMarco) || 'envio_shortlist');
  const [retainerMarco3, setRetainerMarco3] = useState<RetainerMarco>(((job as any)?.retainer_marco_3 as RetainerMarco) || 'finalizacao_vaga');
  const [retainerPerc1, setRetainerPerc1] = useState(String((job as any)?.retainer_perc_1 || '33'));
  const [retainerPerc2, setRetainerPerc2] = useState(String((job as any)?.retainer_perc_2 || '33'));
  const [retainerPerc3, setRetainerPerc3] = useState(String((job as any)?.retainer_perc_3 || '34'));

  // Outplacement
  const [outplacementPercInicio, setOutplacementPercInicio] = useState(String((job as any)?.outplacement_perc_inicio || '50'));
  const [outplacementPercSucesso, setOutplacementPercSucesso] = useState(String((job as any)?.outplacement_perc_sucesso || '50'));

  // RPO
  const [rpoDuracaoMeses, setRpoDuracaoMeses] = useState(String((job as any)?.rpo_duracao_meses || ''));
  const [rpoMediaVagasMes, setRpoMediaVagasMes] = useState(String((job as any)?.rpo_media_vagas_mes || ''));
  const [rpoVagasIniciaisMes, setRpoVagasIniciaisMes] = useState(String((job as any)?.rpo_vagas_iniciais_mes || ''));
  const [rpoVagasMediasMes, setRpoVagasMediasMes] = useState(String((job as any)?.rpo_vagas_medias_mes || ''));
  const [rpoVagasComplexasMes, setRpoVagasComplexasMes] = useState(String((job as any)?.rpo_vagas_complexas_mes || ''));
  const [rpoCustoInicial, setRpoCustoInicial] = useState(String((job as any)?.rpo_custo_consultor_inicial || ''));
  const [rpoCustoMedio, setRpoCustoMedio] = useState(String((job as any)?.rpo_custo_consultor_medio || ''));
  const [rpoCustoComplexo, setRpoCustoComplexo] = useState(String((job as any)?.rpo_custo_consultor_complexo || ''));
  const [rpoValorMensalCliente, setRpoValorMensalCliente] = useState(String((job as any)?.rpo_valor_mensal_cliente || ''));

  // Reset form when job changes
  useEffect(() => {
    if (open && job) {
      setModelo((job as any)?.modelo_contrato || '');
      setSalarioMeta(String((job as any)?.salario_meta || ''));
      setBonusAnualMeta(String((job as any)?.bonus_anual_meta || '0'));
      setFeePercentual(String((job as any)?.fee_percentual || ''));
      setGarantiaDias(String((job as any)?.garantia_dias || '90'));
      setRetainerParcelas(((job as any)?.retainer_parcelas as '2x' | '3x') || '3x');
      setRetainerMarco1(((job as any)?.retainer_marco_1 as RetainerMarco) || 'abertura_vaga');
      setRetainerMarco2(((job as any)?.retainer_marco_2 as RetainerMarco) || 'envio_shortlist');
      setRetainerMarco3(((job as any)?.retainer_marco_3 as RetainerMarco) || 'finalizacao_vaga');
      setRetainerPerc1(String((job as any)?.retainer_perc_1 || '33'));
      setRetainerPerc2(String((job as any)?.retainer_perc_2 || '33'));
      setRetainerPerc3(String((job as any)?.retainer_perc_3 || '34'));
      setOutplacementPercInicio(String((job as any)?.outplacement_perc_inicio || '50'));
      setOutplacementPercSucesso(String((job as any)?.outplacement_perc_sucesso || '50'));
      setRpoDuracaoMeses(String((job as any)?.rpo_duracao_meses || ''));
      setRpoMediaVagasMes(String((job as any)?.rpo_media_vagas_mes || ''));
      setRpoVagasIniciaisMes(String((job as any)?.rpo_vagas_iniciais_mes || ''));
      setRpoVagasMediasMes(String((job as any)?.rpo_vagas_medias_mes || ''));
      setRpoVagasComplexasMes(String((job as any)?.rpo_vagas_complexas_mes || ''));
      setRpoCustoInicial(String((job as any)?.rpo_custo_consultor_inicial || ''));
      setRpoCustoMedio(String((job as any)?.rpo_custo_consultor_medio || ''));
      setRpoCustoComplexo(String((job as any)?.rpo_custo_consultor_complexo || ''));
      setRpoValorMensalCliente(String((job as any)?.rpo_valor_mensal_cliente || ''));
    }
  }, [open, job]);

  const modeloTyped = modelo as ContractModel;

  // Calculated values
  const valorTotalMeta = useMemo(() => {
    if (!modelo || modelo === 'rpo') return 0;
    return calcTotal(modeloTyped, Number(salarioMeta) || 0, Number(bonusAnualMeta) || 0, Number(feePercentual) || 0);
  }, [modelo, salarioMeta, bonusAnualMeta, feePercentual]);

  const rpoCustoMesEstimado = useMemo(() => {
    return (Number(rpoVagasIniciaisMes) || 0) * (Number(rpoCustoInicial) || 0)
      + (Number(rpoVagasMediasMes) || 0) * (Number(rpoCustoMedio) || 0)
      + (Number(rpoVagasComplexasMes) || 0) * (Number(rpoCustoComplexo) || 0);
  }, [rpoVagasIniciaisMes, rpoVagasMediasMes, rpoVagasComplexasMes, rpoCustoInicial, rpoCustoMedio, rpoCustoComplexo]);

  const rpoMargemMes = (Number(rpoValorMensalCliente) || 0) - rpoCustoMesEstimado;
  const rpoReceitaTotal = (Number(rpoValorMensalCliente) || 0) * (Number(rpoDuracaoMeses) || 0);

  const retainerPercentSum = Number(retainerPerc1) + Number(retainerPerc2) + (retainerParcelas === '3x' ? Number(retainerPerc3) : 0);
  const outplacementPercentSum = Number(outplacementPercInicio) + Number(outplacementPercSucesso);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const canSave = () => {
    if (!modelo) return false;
    if (modelo === 'rpo') return true;
    if (!feePercentual) return false;
    if (usesMetaSalary(modeloTyped) && !salarioMeta) return false;
    if (isRetainer(modeloTyped) && retainerPercentSum !== 100) return false;
    if (modelo === 'outplacement_mentoria' && outplacementPercentSum !== 100) return false;
    return true;
  };

  const handleSave = async () => {
    const updates: any = {
      id: job.id,
      modelo_contrato: modelo,
      salario_meta: salarioMeta ? Number(salarioMeta) : null,
      bonus_anual_meta: Number(bonusAnualMeta) || 0,
      fee_percentual: feePercentual ? Number(feePercentual) : null,
      garantia_dias: Number(garantiaDias) || 90,
    };

    if (isRetainer(modeloTyped)) {
      updates.retainer_parcelas = retainerParcelas;
      updates.retainer_marco_1 = retainerMarco1;
      updates.retainer_marco_2 = retainerMarco2;
      updates.retainer_marco_3 = retainerParcelas === '3x' ? retainerMarco3 : null;
      updates.retainer_perc_1 = Number(retainerPerc1);
      updates.retainer_perc_2 = Number(retainerPerc2);
      updates.retainer_perc_3 = retainerParcelas === '3x' ? Number(retainerPerc3) : null;
    }

    if (modelo === 'outplacement_mentoria') {
      updates.outplacement_perc_inicio = Number(outplacementPercInicio);
      updates.outplacement_perc_sucesso = Number(outplacementPercSucesso);
    }

    if (modelo === 'rpo') {
      updates.rpo_duracao_meses = Number(rpoDuracaoMeses) || null;
      updates.rpo_media_vagas_mes = Number(rpoMediaVagasMes) || null;
      updates.rpo_vagas_iniciais_mes = Number(rpoVagasIniciaisMes) || null;
      updates.rpo_vagas_medias_mes = Number(rpoVagasMediasMes) || null;
      updates.rpo_vagas_complexas_mes = Number(rpoVagasComplexasMes) || null;
      updates.rpo_custo_consultor_inicial = Number(rpoCustoInicial) || null;
      updates.rpo_custo_consultor_medio = Number(rpoCustoMedio) || null;
      updates.rpo_custo_consultor_complexo = Number(rpoCustoComplexo) || null;
      updates.rpo_valor_mensal_cliente = Number(rpoValorMensalCliente) || null;
    }

    try {
      await updateJob.mutateAsync(updates);

      // Auto-create opening milestone if applicable
      const isNewContract = !(job as any)?.modelo_contrato;
      if (isNewContract) {
        const today = new Date().toISOString().split('T')[0];

        if (isRetainer(modeloTyped) && retainerMarco1 === 'abertura_vaga') {
          const parcelaValor = valorTotalMeta * (Number(retainerPerc1) / 100);
          await createMilestone.mutateAsync({
            job_id: job.id,
            milestone_type: 'abertura_vaga',
            percentage: Number(retainerPerc1),
            valor: parcelaValor,
            description: `Parcela 1 — Abertura (${retainerPerc1}%) — ${companyName || 'Vaga'}: ${job.title}`,
            pacote: 'Receita de Serviços',
            conta_contabil: 'Honorários de Recrutamento',
            data_referencia: today,
            data_vencimento: today,
          });
        }

        if (modelo === 'outplacement_mentoria') {
          const parcelaValor = valorTotalMeta * (Number(outplacementPercInicio) / 100);
          await createMilestone.mutateAsync({
            job_id: job.id,
            milestone_type: 'inicio_outplacement',
            percentage: Number(outplacementPercInicio),
            valor: parcelaValor,
            description: `Parcela Início (${outplacementPercInicio}%) — Outplacement: ${job.title}`,
            pacote: 'Receita de Serviços',
            conta_contabil: 'Honorários de Outplacement',
            data_referencia: today,
            data_vencimento: today,
          });
        }

        if (modelo === 'rpo' && rpoReceitaTotal > 0) {
          // Distribute RPO revenue across months
          const months = Number(rpoDuracaoMeses) || 1;
          const monthlyValue = Number(rpoValorMensalCliente) || 0;
          const startDate = new Date();
          
          for (let i = 0; i < months; i++) {
            const d = new Date(startDate);
            d.setMonth(d.getMonth() + i);
            const dateStr = d.toISOString().split('T')[0];
            await createMilestone.mutateAsync({
              job_id: job.id,
              milestone_type: 'rpo_ciclo_mensal',
              valor: monthlyValue,
              description: `RPO Ciclo ${i + 1}/${months} — ${companyName || 'Cliente'}: ${job.title}`,
              pacote: 'Receita de Serviços',
              conta_contabil: 'Receita RPO',
              data_referencia: dateStr,
              data_vencimento: dateStr,
              rpo_cycle_month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            });
          }
        }
      }

      toast.success('Modelo de contrato salvo!');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao salvar contrato');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modelo de Contrato
          </DialogTitle>
          <DialogDescription>
            Configure o modelo de contrato e premissas financeiras desta vaga.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Modelo de Contrato</Label>
            <Select value={modelo} onValueChange={(v) => setModelo(v as ContractModel)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar modelo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contractModelLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modelo && modelo !== 'rpo' && (
            <>
              <Separator />
              {/* Base fields */}
              <div className="grid grid-cols-2 gap-4">
                {usesMetaSalary(modeloTyped) && (
                  <div className="space-y-2">
                    <Label>Salário Meta (R$)</Label>
                    <Input type="number" value={salarioMeta} onChange={(e) => setSalarioMeta(e.target.value)} placeholder="10000" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Bônus Anual Meta (R$)</Label>
                  <Input type="number" value={bonusAnualMeta} onChange={(e) => setBonusAnualMeta(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Fee (%)</Label>
                  <Input type="number" value={feePercentual} onChange={(e) => setFeePercentual(e.target.value)} placeholder="20" />
                </div>
                <div className="space-y-2">
                  <Label>Garantia (dias)</Label>
                  <Input type="number" value={garantiaDias} onChange={(e) => setGarantiaDias(e.target.value)} placeholder="90" />
                </div>
              </div>

              {/* Projected value */}
              {valorTotalMeta > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        Valor Total Projetado
                      </span>
                      <span className="text-lg font-semibold">{formatCurrency(valorTotalMeta)}</span>
                    </div>
                    {usesMetaSalary(modeloTyped) && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Baseado no salário meta. Será reconciliado no fechamento.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Retainer config */}
          {isRetainer(modeloTyped) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Configuração de Parcelas</h4>
                <div className="space-y-2">
                  <Label>Quantidade de Parcelas</Label>
                  <Select value={retainerParcelas} onValueChange={(v) => setRetainerParcelas(v as '2x' | '3x')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2x">2 parcelas</SelectItem>
                      <SelectItem value="3x">3 parcelas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  {/* Parcela 1 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">Marco 1</Label>
                      <Select value={retainerMarco1} onValueChange={(v) => setRetainerMarco1(v as RetainerMarco)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(retainerMarcoLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">%</Label>
                      <Input type="number" value={retainerPerc1} onChange={(e) => setRetainerPerc1(e.target.value)} />
                    </div>
                    {valorTotalMeta > 0 && (
                      <span className="text-xs text-muted-foreground mt-5 w-24">{formatCurrency(valorTotalMeta * Number(retainerPerc1) / 100)}</span>
                    )}
                  </div>

                  {/* Parcela 2 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">Marco 2</Label>
                      <Select value={retainerMarco2} onValueChange={(v) => setRetainerMarco2(v as RetainerMarco)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(retainerMarcoLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">%</Label>
                      <Input type="number" value={retainerPerc2} onChange={(e) => setRetainerPerc2(e.target.value)} />
                    </div>
                    {valorTotalMeta > 0 && (
                      <span className="text-xs text-muted-foreground mt-5 w-24">{formatCurrency(valorTotalMeta * Number(retainerPerc2) / 100)}</span>
                    )}
                  </div>

                  {/* Parcela 3 */}
                  {retainerParcelas === '3x' && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Marco 3</Label>
                        <Select value={retainerMarco3} onValueChange={(v) => setRetainerMarco3(v as RetainerMarco)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(retainerMarcoLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">%</Label>
                        <Input type="number" value={retainerPerc3} onChange={(e) => setRetainerPerc3(e.target.value)} />
                      </div>
                      {valorTotalMeta > 0 && (
                        <span className="text-xs text-muted-foreground mt-5 w-24">{formatCurrency(valorTotalMeta * Number(retainerPerc3) / 100)}</span>
                      )}
                    </div>
                  )}
                </div>

                {retainerPercentSum !== 100 && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Soma dos percentuais deve ser 100% (atual: {retainerPercentSum}%)
                  </div>
                )}
              </div>
            </>
          )}

          {/* Outplacement com Mentoria */}
          {modelo === 'outplacement_mentoria' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Divisão de Pagamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>% no Início</Label>
                    <Input type="number" value={outplacementPercInicio} onChange={(e) => setOutplacementPercInicio(e.target.value)} />
                    {valorTotalMeta > 0 && (
                      <p className="text-xs text-muted-foreground">{formatCurrency(valorTotalMeta * Number(outplacementPercInicio) / 100)}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>% no Sucesso</Label>
                    <Input type="number" value={outplacementPercSucesso} onChange={(e) => setOutplacementPercSucesso(e.target.value)} />
                    {valorTotalMeta > 0 && (
                      <p className="text-xs text-muted-foreground">{formatCurrency(valorTotalMeta * Number(outplacementPercSucesso) / 100)}</p>
                    )}
                  </div>
                </div>
                {outplacementPercentSum !== 100 && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Soma dos percentuais deve ser 100% (atual: {outplacementPercentSum}%)
                  </div>
                )}
              </div>
            </>
          )}

          {/* RPO */}
          {modelo === 'rpo' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Premissas do Contrato RPO</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração (meses)</Label>
                    <Input type="number" value={rpoDuracaoMeses} onChange={(e) => setRpoDuracaoMeses(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Média vagas/mês</Label>
                    <Input type="number" value={rpoMediaVagasMes} onChange={(e) => setRpoMediaVagasMes(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor mensal do cliente (R$)</Label>
                    <Input type="number" value={rpoValorMensalCliente} onChange={(e) => setRpoValorMensalCliente(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Garantia (dias)</Label>
                    <Input type="number" value={garantiaDias} onChange={(e) => setGarantiaDias(e.target.value)} />
                  </div>
                </div>

                <h5 className="font-medium text-xs text-muted-foreground mt-2">Mix de Complexidade (vagas/mês estimadas)</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Iniciais</Label>
                    <Input type="number" value={rpoVagasIniciaisMes} onChange={(e) => setRpoVagasIniciaisMes(e.target.value)} placeholder="0" />
                    <Label className="text-xs text-muted-foreground">Custo unit. R$</Label>
                    <Input type="number" value={rpoCustoInicial} onChange={(e) => setRpoCustoInicial(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Médias</Label>
                    <Input type="number" value={rpoVagasMediasMes} onChange={(e) => setRpoVagasMediasMes(e.target.value)} placeholder="0" />
                    <Label className="text-xs text-muted-foreground">Custo unit. R$</Label>
                    <Input type="number" value={rpoCustoMedio} onChange={(e) => setRpoCustoMedio(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Complexas</Label>
                    <Input type="number" value={rpoVagasComplexasMes} onChange={(e) => setRpoVagasComplexasMes(e.target.value)} placeholder="0" />
                    <Label className="text-xs text-muted-foreground">Custo unit. R$</Label>
                    <Input type="number" value={rpoCustoComplexo} onChange={(e) => setRpoCustoComplexo(e.target.value)} />
                  </div>
                </div>

                {/* RPO Projections */}
                {(Number(rpoValorMensalCliente) > 0 || rpoCustoMesEstimado > 0) && (
                  <Card className="bg-muted/50">
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custo/mês estimado</span>
                        <span>{formatCurrency(rpoCustoMesEstimado)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Margem/mês estimada</span>
                        <span className={rpoMargemMes >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(rpoMargemMes)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm font-medium">
                        <span>Receita total projetada</span>
                        <span>{formatCurrency(rpoReceitaTotal)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave() || updateJob.isPending || createMilestone.isPending}>
            {updateJob.isPending || createMilestone.isPending ? 'Salvando...' : 'Salvar Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
