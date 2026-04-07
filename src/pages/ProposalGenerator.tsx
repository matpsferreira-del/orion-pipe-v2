import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Download, FileDown, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/useCompanies';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import orionLogo from '@/assets/orion-logo.png';

// ── Types ──
interface CaseItem { name: string; logoUrl: string; segment: string }
interface NumberItem { value: string; label: string }
interface DiffItem { icon: string; title: string; desc: string }
interface MethodItem { step: string; title: string; desc: string; time: string }
interface WorkItem { icon: string; title: string; desc: string }
interface SpecItem { icon: string; title: string; desc: string }

// ── Defaults ──
const DEFAULT_NUMBERS: NumberItem[] = [
  { value: '500+', label: 'Profissionais mapeados/ano' },
  { value: '', label: 'SLA médio' },
  { value: '95%', label: 'Taxa de aderência cultural' },
  { value: '30', label: 'Dias de garantia de reposição' },
];
const DEFAULT_DIFFS: DiffItem[] = [
  { icon: '💎', title: 'Exclusividade no Processo', desc: 'Cada projeto recebe dedicação integral de um consultor especialista. 100% do esforço direcionado ao seu desafio.' },
  { icon: '🤖', title: 'IA + Hunting Ativo', desc: 'IA para mapeamento preditivo combinada com abordagem humana consultiva. Acessamos talentos passivos que outros métodos não alcançam.' },
  { icon: '⚡', title: 'SLA Agressivo', desc: '' },
  { icon: '🔒', title: 'Sigilo Total', desc: 'Processos conduzidos com total confidencialidade. Informações sensíveis protegidas em todas as etapas.' },
];
const DEFAULT_METHOD: MethodItem[] = [
  { step: '01', title: 'Alinhamento Estratégico', desc: 'Imersão no desafio: cultura, contexto da área, perfil ideal e critérios eliminatórios.', time: 'Dia 1-2' },
  { step: '02', title: 'Mapeamento & Hunting', desc: 'Busca multicanal: LinkedIn Recruiter, base proprietária, IA preditiva e rede de contatos.', time: 'Dia 3-8' },
  { step: '03', title: 'Triagem & Validação', desc: 'Entrevistas por competência, avaliação técnica e análise de fit cultural rigorosa.', time: 'Dia 6-10' },
  { step: '04', title: 'Shortlist & Parecer', desc: '3-5 candidatos finalistas com parecer detalhado: histórico, motivações e pontos de atenção.', time: 'Dia 10-12' },
  { step: '05', title: 'Acompanhamento & Garantia', desc: 'Suporte na negociação, acompanhamento do onboarding e monitoramento no período de garantia.', time: 'Pós-contratação' },
];
const DEFAULT_WORK: WorkItem[] = [
  { icon: '📋', title: 'Processo Consultivo', desc: 'Não somos apenas fornecedores — somos parceiros estratégicos. Atuamos como extensão da sua equipe de RH.' },
  { icon: '🔄', title: 'Atualizações Semanais', desc: 'Relatórios de progresso semanais com métricas de pipeline: candidatos mapeados, abordados, entrevistados e aprovados.' },
  { icon: '🎯', title: 'Foco em Resultado', desc: 'Trabalhamos orientados por KPIs claros: tempo de preenchimento, taxa de aprovação, aderência cultural e permanência.' },
  { icon: '🌐', title: 'Cobertura Nacional', desc: 'Operamos em todos os 26 estados + DF com processos remote-friendly, mantendo o mesmo padrão de qualidade.' },
  { icon: '🤝', title: 'Ponto Focal Dedicado', desc: 'Cada cliente tem um consultor dedicado do início ao fim, garantindo continuidade, contexto e agilidade.' },
  { icon: '📊', title: 'Inteligência de Mercado', desc: 'Compartilhamos insights sobre benchmark salarial, disponibilidade de talentos e tendências do mercado.' },
];
const DEFAULT_SPECS: SpecItem[] = [
  { icon: '💻', title: 'Tecnologia', desc: 'Mapeamento de devs, dados, infra e produto. Liderança técnica de ponta.' },
  { icon: '⚖️', title: 'Finanças & Jurídico', desc: 'Posições críticas de C-Level, controladoria, tributário e compliance.' },
  { icon: '⚙️', title: 'Engenharia', desc: 'Líderes de manufatura, supply chain e operações para a indústria.' },
  { icon: '📈', title: 'Marketing & Sales', desc: 'Estratégia de growth, performance, branding e força de vendas B2B/B2C.' },
  { icon: '👥', title: 'Recursos Humanos', desc: 'Business partners, talent acquisition e líderes para desenvolvimento humano.' },
];

// ── Shared styles ──
const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none text-xs shadow-inner";
const gridPattern = { position: 'absolute' as const, inset: 0, backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' as const };

export default function ProposalGenerator() {
  const { id } = useParams<{id: string}>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('opportunities').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.id === opportunity?.company_id);

  // ── Basic state ──
  const [empresa, setEmpresa] = useState('');
  const [sla, setSla] = useState('10 a 12 dias úteis');
  const [exclusividade, setExclusividade] = useState('com exclusividade no processo');
  const [garantia, setGarantia] = useState('30 dias');
  const [fee, setFee] = useState('100%');
  const [feeModel, setFeeModel] = useState<'salario_mensal' | 'remuneracao_anual'>('salario_mensal');
  const [feePercentual, setFeePercentual] = useState('20%');
  const [contractTypeProposal, setContractTypeProposal] = useState<'CLT' | 'PJ'>('CLT');
  const [paymentModel, setPaymentModel] = useState('sucesso');
  const [retainerType, setRetainerType] = useState('3x');
  const [feeP1, setFeeP1] = useState('30%');
  const [feeP2, setFeeP2] = useState('30%');
  const [feeP3, setFeeP3] = useState('40%');
  const [isExporting, setIsExporting] = useState(false);
  const [proposalMode, setProposalMode] = useState<'simples' | 'completa'>('simples');

  // ── Editable content for complete mode ──
  const [aboutText1, setAboutText1] = useState('Somos uma consultoria especializada em recrutamento estratégico com atuação nacional. Unimos inteligência de mercado, hunting ativo e tecnologia para conectar empresas aos profissionais certos — com velocidade, precisão e confidencialidade.');
  const [aboutText2, setAboutText2] = useState('Nossa abordagem é consultiva: entendemos o contexto do negócio, a cultura organizacional e as competências técnicas e comportamentais necessárias antes de iniciar qualquer busca.');
  const [aboutNumbers, setAboutNumbers] = useState<NumberItem[]>(DEFAULT_NUMBERS);
  const [differentials, setDifferentials] = useState<DiffItem[]>(DEFAULT_DIFFS);
  const [methodology, setMethodology] = useState<MethodItem[]>(DEFAULT_METHOD);
  const [workModel, setWorkModel] = useState<WorkItem[]>(DEFAULT_WORK);
  const [specs, setSpecs] = useState<SpecItem[]>(DEFAULT_SPECS);

  // ── Cases de Sucesso (both modes) ──
  const [showCases, setShowCases] = useState(false);
  const [cases, setCases] = useState<CaseItem[]>([
    { name: '', logoUrl: '', segment: '' },
  ]);

  // ── Sidebar section collapse ──
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (s: string) => setOpenSection(prev => prev === s ? null : s);

  useEffect(() => {
    if (!opportunity) return;
    const slaVal = opportunity.proposal_sla || '10 a 12 dias úteis';
    setEmpresa(company?.nome_fantasia || '');
    setSla(slaVal);
    setExclusividade(opportunity.proposal_exclusivity || 'com exclusividade no processo');
    setGarantia(opportunity.proposal_guarantee || '30 dias');
    setFee(opportunity.proposal_fee || '100%');
    setPaymentModel(opportunity.proposal_payment_model || 'sucesso');
    setRetainerType(opportunity.proposal_retainer_type || '3x');
    setFeeP1(opportunity.proposal_fee_p1 || '30%');
    setFeeP2(opportunity.proposal_fee_p2 || '30%');
    setFeeP3(opportunity.proposal_fee_p3 || '40%');
    // Update SLA-dependent defaults
    setAboutNumbers(prev => prev.map((n, i) => i === 1 ? { ...n, value: slaVal } : n));
    setDifferentials(prev => prev.map((d, i) => i === 2 ? { ...d, desc: `Apresentação dos primeiros candidatos hiper-qualificados em até ${slaVal} — validados técnica e culturalmente.` } : d));
  }, [opportunity, company]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('opportunities').update({
        proposal_sla: sla, proposal_exclusivity: exclusividade, proposal_guarantee: garantia,
        proposal_fee: fee, proposal_payment_model: paymentModel, proposal_retainer_type: retainerType,
        proposal_fee_p1: feeP1, proposal_fee_p2: feeP2, proposal_fee_p3: feeP3
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['opportunity', id] }); queryClient.invalidateQueries({ queryKey: ['opportunities'] }); toast.success('Padrões salvos!'); },
    onError: (err: Error) => toast.error('Erro: ' + err.message)
  });

  const paneRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scaleSlides = useCallback(() => {
    if (!paneRef.current || !wrapperRef.current || !containerRef.current) return;
    wrapperRef.current.style.transform = 'none';
    const availableWidth = paneRef.current.clientWidth - 48;
    let scale = availableWidth / 1280;
    if (scale > 1) scale = 1;
    wrapperRef.current.style.transform = `scale(${scale})`;
    containerRef.current.style.height = `${wrapperRef.current.scrollHeight * scale}px`;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', scaleSlides);
    const timer = setTimeout(scaleSlides, 150);
    return () => { window.removeEventListener('resize', scaleSlides); clearTimeout(timer); };
  }, [scaleSlides, paymentModel, retainerType, proposalMode, showCases]);

  const handleRetainerChange = (val: string) => {
    setRetainerType(val);
    if (val === '2x') { setFeeP1('50%'); setFeeP3('50%'); } else { setFeeP1('30%'); setFeeP2('30%'); setFeeP3('40%'); }
  };

  // ── Array helpers ──
  const updateArr = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number, field: keyof T, val: string) =>
    setter(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  const addCase = () => setCases(p => [...p, { name: '', logoUrl: '', segment: '' }]);
  const removeCase = (i: number) => setCases(p => p.filter((_, j) => j !== i));

  // ── Export (same as before) ──
  const handleExportPDF = async () => {
    const slides = document.querySelectorAll('.proposal-slide') as NodeListOf<HTMLElement>;
    if (!slides.length) return;
    setIsExporting(true); toast.info('Gerando PDF...');
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720] });
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const orig = { br: s.style.borderRadius, bs: s.style.boxShadow, bd: s.style.border };
        s.style.borderRadius = '0'; s.style.boxShadow = 'none'; s.style.border = 'none';
        const dataUrl = await toPng(s, { width: 1280, height: 720, pixelRatio: 2, backgroundColor: '#0f172a' });
        s.style.borderRadius = orig.br; s.style.boxShadow = orig.bs; s.style.border = orig.bd;
        if (i > 0) pdf.addPage([1280, 720], 'landscape');
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1280, 720);
      }
      pdf.save(empresa ? `Orion_Recruitment_-_Proposta_${empresa.replace(/\s+/g, '_')}.pdf` : 'Orion_Recruitment_-_Proposta_Comercial.pdf');
      toast.success('PDF exportado!');
    } catch (err) { console.error(err); toast.error('Erro ao gerar PDF.'); } finally { setIsExporting(false); }
  };

  const handleExportPPT = async () => {
    const slides = document.querySelectorAll('.proposal-slide') as NodeListOf<HTMLElement>;
    if (!slides.length) return;
    setIsExporting(true); toast.info('Gerando PPT...');
    try {
      const pres = new pptxgen(); pres.layout = 'LAYOUT_WIDE';
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const orig = { br: s.style.borderRadius, bs: s.style.boxShadow, bd: s.style.border };
        s.style.borderRadius = '0'; s.style.boxShadow = 'none'; s.style.border = 'none';
        const dataUrl = await toPng(s, { width: 1280, height: 720, pixelRatio: 2, backgroundColor: '#0f172a' });
        s.style.borderRadius = orig.br; s.style.boxShadow = orig.bs; s.style.border = orig.bd;
        const pptSlide = pres.addSlide();
        pptSlide.background = { color: '0f172a' };
        pptSlide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
      }
      await pres.writeFile({ fileName: `${empresa ? `Orion_Recruitment_-_Proposta_${empresa.replace(/\s+/g, '_')}` : 'Orion_Recruitment_-_Proposta_Comercial'}.pptx` });
      toast.success('PPT exportado!');
    } catch (err) { console.error(err); toast.error('Erro ao gerar PPT.'); } finally { setIsExporting(false); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>;

  // ── Section header component ──
  const SectionHeader = ({ id: sid, label }: { id: string; label: string }) => (
    <button onClick={() => toggleSection(sid)} className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider py-2 hover:text-cyan-400 transition-colors">
      {label}
      <span className="text-slate-500">{openSection === sid ? '▾' : '▸'}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#020617] text-white w-full font-sans">
      <style>{`
        .proposal-slide {
          background-color: #0f172a; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          display: flex; flex-direction: column; justify-content: center; overflow: hidden; padding: 60px;
          position: relative; width: 1280px !important; height: 720px !important; flex: 0 0 720px !important;
          box-sizing: border-box; border: 1px solid #1e293b;
        }
        .proposal-slide > * { position: relative; z-index: 1; }
        .highlight-numbers-layout > div:first-child { flex: 0 0 40%; text-align: center; }
        @media print {
          @page { size: 1280px 720px; margin: 0; }
          body, html { width: 1280px !important; }
          #proposal-sidebar { display: none !important; }
          #proposal-preview-pane { width: 1280px !important; padding: 0 !important; overflow: visible !important; }
          #proposal-scale-container { height: auto !important; }
          #proposal-scale-wrapper { transform: none !important; width: 1280px !important; }
          .proposal-slide { border-radius: 0 !important; border: none !important; page-break-after: always; box-shadow: none !important; }
        }
      `}</style>

      {/* ══════ SIDEBAR ══════ */}
      <div id="proposal-sidebar" className="w-full md:w-[380px] bg-slate-900/80 border-r border-slate-700/50 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-5 border-b border-slate-700/50">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-cyan-400 flex items-center gap-2 text-sm mb-4"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          <h2 className="text-xl font-bold text-white">CRM | Proposta</h2>
          <p className="text-slate-400 text-xs mt-1">Configure os dados. A proposta atualiza ao lado.</p>
        </div>

        <div className="p-5 space-y-3 flex-1">
          {/* ── Básico ── */}
          <div><label className="text-xs text-slate-400 mb-1 block">Cliente / Empresa</label><input value={empresa} onChange={e => setEmpresa(e.target.value)} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">SLA de Entrega</label><input value={sla} onChange={e => setSla(e.target.value)} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Exclusividade</label>
            <select value={exclusividade} onChange={e => setExclusividade(e.target.value)} className={inputCls + ' cursor-pointer appearance-none'}>
              <option value="com exclusividade no processo">Sim (Com Exclusividade)</option>
              <option value="sem exclusividade no processo">Não (Sem Exclusividade)</option>
            </select>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Período de Garantia</label>
            <select value={garantia} onChange={e => setGarantia(e.target.value)} className={inputCls + ' cursor-pointer appearance-none'}>
              {['30 dias','45 dias','60 dias','90 dias'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Tipo de Proposta</label>
            <select value={proposalMode} onChange={e => setProposalMode(e.target.value as any)} className={inputCls + ' cursor-pointer appearance-none'}>
              <option value="simples">Simples</option>
              <option value="completa">Completa (slides extras)</option>
            </select>
          </div>

          <hr className="border-slate-700/50" />

          {/* ── Honorários ── */}
          <div className="space-y-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Modelo de Honorários</label>
              <select value={feeModel} onChange={e => setFeeModel(e.target.value as any)} className={inputCls + ' cursor-pointer appearance-none'}>
                <option value="salario_mensal">Taxa sobre Salário Mensal</option>
                <option value="remuneracao_anual">Taxa sobre Remuneração Anual</option>
              </select>
            </div>
            {feeModel === 'salario_mensal' ? (
              <>
                <div><label className="text-xs text-slate-400 mb-1 block">Honorário Total</label>
                  <div className="flex items-center gap-2"><input value={fee} onChange={e => setFee(e.target.value)} className="w-24 bg-slate-900 border border-cyan-700/50 rounded-lg p-2.5 text-white font-bold focus:border-cyan-500 focus:outline-none text-xs text-center" /><span className="text-slate-400 text-xs">da remuneração mensal</span></div>
                </div>
                <div><label className="text-xs text-slate-400 mb-1 block">Modelo de Pagamento</label>
                  <select value={paymentModel} onChange={e => setPaymentModel(e.target.value)} className={inputCls + ' cursor-pointer appearance-none'}>
                    <option value="sucesso">100% no Sucesso</option><option value="retainer">Retainer (Parcelado)</option>
                  </select>
                </div>
                {paymentModel === 'retainer' && <RetainerInputs retainerType={retainerType} onRetainerChange={handleRetainerChange} feeP1={feeP1} setFeeP1={setFeeP1} feeP2={feeP2} setFeeP2={setFeeP2} feeP3={feeP3} setFeeP3={setFeeP3} />}
              </>
            ) : (
              <div className="space-y-3">
                <div><label className="text-xs text-slate-400 mb-1 block">Fee (%)</label>
                  <div className="flex items-center gap-2"><input value={feePercentual} onChange={e => setFeePercentual(e.target.value)} className="w-24 bg-slate-900 border border-cyan-700/50 rounded-lg p-2.5 text-white font-bold focus:border-cyan-500 focus:outline-none text-xs text-center" /><span className="text-slate-400 text-xs">da remuneração anual</span></div>
                </div>
                <div><label className="text-xs text-slate-400 mb-1 block">Tipo de Contrato</label>
                  <select value={contractTypeProposal} onChange={e => setContractTypeProposal(e.target.value as any)} className={inputCls + ' cursor-pointer appearance-none'}>
                    <option value="CLT">CLT (13,33 salários)</option><option value="PJ">PJ (12 salários)</option>
                  </select>
                </div>
                <div><label className="text-xs text-slate-400 mb-1 block">Modelo de Pagamento</label>
                  <select value={paymentModel} onChange={e => setPaymentModel(e.target.value)} className={inputCls + ' cursor-pointer appearance-none'}>
                    <option value="sucesso">100% no Sucesso</option><option value="retainer">Retainer (Parcelado)</option>
                  </select>
                </div>
                {paymentModel === 'retainer' && <RetainerInputs retainerType={retainerType} onRetainerChange={handleRetainerChange} feeP1={feeP1} setFeeP1={setFeeP1} feeP2={feeP2} setFeeP2={setFeeP2} feeP3={feeP3} setFeeP3={setFeeP3} />}
              </div>
            )}
          </div>

          <hr className="border-slate-700/50" />

          {/* ── Especialidades (editable) ── */}
          <SectionHeader id="specs" label="Especialidades" />
          {openSection === 'specs' && (
            <div className="space-y-3">
              {specs.map((sp, i) => (
                <div key={i} className="bg-slate-800/40 rounded-lg p-2.5 space-y-1.5 border border-slate-700/30">
                  <div className="flex gap-2">
                    <input value={sp.icon} onChange={e => updateArr(setSpecs, i, 'icon', e.target.value)} className="w-10 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-sm" />
                    <input value={sp.title} onChange={e => updateArr(setSpecs, i, 'title', e.target.value)} className={inputCls + ' flex-1'} placeholder="Título" />
                  </div>
                  <textarea value={sp.desc} onChange={e => updateArr(setSpecs, i, 'desc', e.target.value)} className={inputCls + ' min-h-[40px]'} rows={2} />
                </div>
              ))}
            </div>
          )}

          {/* ── Conteúdo Completa ── */}
          {proposalMode === 'completa' && (
            <>
              <hr className="border-slate-700/50" />
              <SectionHeader id="about" label="Quem é a Orion" />
              {openSection === 'about' && (
                <div className="space-y-3">
                  <textarea value={aboutText1} onChange={e => setAboutText1(e.target.value)} className={inputCls + ' min-h-[60px]'} rows={3} placeholder="Parágrafo 1" />
                  <textarea value={aboutText2} onChange={e => setAboutText2(e.target.value)} className={inputCls + ' min-h-[60px]'} rows={3} placeholder="Parágrafo 2" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">Números</p>
                  {aboutNumbers.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={n.value} onChange={e => updateArr(setAboutNumbers, i, 'value', e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-400 font-bold text-center text-xs" />
                      <input value={n.label} onChange={e => updateArr(setAboutNumbers, i, 'label', e.target.value)} className={inputCls + ' flex-1'} />
                    </div>
                  ))}
                </div>
              )}

              <SectionHeader id="diffs" label="Diferenciais" />
              {openSection === 'diffs' && (
                <div className="space-y-3">
                  {differentials.map((d, i) => (
                    <div key={i} className="bg-slate-800/40 rounded-lg p-2.5 space-y-1.5 border border-slate-700/30">
                      <div className="flex gap-2">
                        <input value={d.icon} onChange={e => updateArr(setDifferentials, i, 'icon', e.target.value)} className="w-10 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-sm" />
                        <input value={d.title} onChange={e => updateArr(setDifferentials, i, 'title', e.target.value)} className={inputCls + ' flex-1'} />
                      </div>
                      <textarea value={d.desc} onChange={e => updateArr(setDifferentials, i, 'desc', e.target.value)} className={inputCls + ' min-h-[40px]'} rows={2} />
                    </div>
                  ))}
                </div>
              )}

              <SectionHeader id="method" label="Metodologia" />
              {openSection === 'method' && (
                <div className="space-y-3">
                  {methodology.map((m, i) => (
                    <div key={i} className="bg-slate-800/40 rounded-lg p-2.5 space-y-1.5 border border-slate-700/30">
                      <div className="flex gap-2">
                        <input value={m.step} onChange={e => updateArr(setMethodology, i, 'step', e.target.value)} className="w-10 bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-400 font-bold text-center text-xs" />
                        <input value={m.title} onChange={e => updateArr(setMethodology, i, 'title', e.target.value)} className={inputCls + ' flex-1'} />
                        <input value={m.time} onChange={e => updateArr(setMethodology, i, 'time', e.target.value)} className="w-24 bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-400 text-center text-xs font-mono" />
                      </div>
                      <textarea value={m.desc} onChange={e => updateArr(setMethodology, i, 'desc', e.target.value)} className={inputCls + ' min-h-[40px]'} rows={2} />
                    </div>
                  ))}
                </div>
              )}

              <SectionHeader id="work" label="Modelo de Trabalho" />
              {openSection === 'work' && (
                <div className="space-y-3">
                  {workModel.map((w, i) => (
                    <div key={i} className="bg-slate-800/40 rounded-lg p-2.5 space-y-1.5 border border-slate-700/30">
                      <div className="flex gap-2">
                        <input value={w.icon} onChange={e => updateArr(setWorkModel, i, 'icon', e.target.value)} className="w-10 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-sm" />
                        <input value={w.title} onChange={e => updateArr(setWorkModel, i, 'title', e.target.value)} className={inputCls + ' flex-1'} />
                      </div>
                      <textarea value={w.desc} onChange={e => updateArr(setWorkModel, i, 'desc', e.target.value)} className={inputCls + ' min-h-[40px]'} rows={2} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <hr className="border-slate-700/50" />

          {/* ── Cases de Sucesso (both modes) ── */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Slide de Cases de Sucesso</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={showCases} onChange={e => setShowCases(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-700 peer-checked:bg-cyan-600 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          {showCases && (
            <div className="space-y-3">
              {cases.map((c, i) => (
                <div key={i} className="bg-slate-800/40 rounded-lg p-2.5 space-y-1.5 border border-slate-700/30">
                  <div className="flex gap-2 items-center">
                    <input value={c.name} onChange={e => updateArr(setCases, i, 'name', e.target.value)} className={inputCls + ' flex-1'} placeholder="Nome da empresa" />
                    <button onClick={() => removeCase(i)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <input value={c.segment} onChange={e => updateArr(setCases, i, 'segment', e.target.value)} className={inputCls} placeholder="Segmento (ex: Tecnologia)" />
                  <input value={c.logoUrl} onChange={e => updateArr(setCases, i, 'logoUrl', e.target.value)} className={inputCls} placeholder="URL da logo (https://...)" />
                  {c.logoUrl && <img src={c.logoUrl} alt={c.name} className="h-8 object-contain rounded bg-white/10 p-1" onError={e => (e.currentTarget.style.display = 'none')} />}
                </div>
              ))}
              <button onClick={addCase} className="w-full border border-dashed border-slate-600 rounded-lg p-2 text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-600 flex items-center justify-center gap-1">
                <Plus className="h-3 w-3" /> Adicionar empresa
              </button>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="p-5 border-t border-slate-700/50 space-y-2">
          <button onClick={() => saveMutation.mutate()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-all flex justify-center items-center gap-2 text-sm">
            <Save className="h-4 w-4" />{saveMutation.isPending ? 'Salvando...' : 'Salvar Padrões'}
          </button>
          <button onClick={handleExportPDF} disabled={isExporting} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-50">
            {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><Download className="h-4 w-4" /> Exportar PDF</>}
          </button>
          <button onClick={handleExportPPT} disabled={isExporting} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-50">
            {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><FileDown className="h-4 w-4" /> Exportar PPT</>}
          </button>
        </div>
      </div>

      {/* ══════ PREVIEW ══════ */}
      <div id="proposal-preview-pane" ref={paneRef} className="flex-1 overflow-y-auto p-6 bg-[#020617]">
        <div id="proposal-scale-container" ref={containerRef} className="origin-top-left">
          <div id="proposal-scale-wrapper" ref={wrapperRef} className="flex flex-col gap-8 origin-top-left" style={{ width: 1280 }}>

            {/* ── Slide 1: Cover ── */}
            <div className="proposal-slide" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const }}>
              <div style={gridPattern} />
              <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#22d3ee" strokeWidth="2.5" />
                <ellipse cx="50" cy="50" rx="20" ry="34" stroke="#22d3ee" strokeWidth="2.5" />
                <line x1="50" y1="4" x2="33" y2="20" stroke="#22d3ee" strokeWidth="1.5" /><line x1="50" y1="4" x2="67" y2="20" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="15" y1="15" x2="33" y2="20" stroke="#22d3ee" strokeWidth="1.5" /><line x1="15" y1="15" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="33" y1="20" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="85" y1="15" x2="67" y2="20" stroke="#22d3ee" strokeWidth="1.5" /><line x1="85" y1="15" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="67" y1="20" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="4" y1="50" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="15" y1="15" x2="4" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="15" y1="85" x2="4" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="96" y1="50" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="85" y1="15" x2="96" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="85" y1="85" x2="96" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="50" y1="96" x2="33" y2="80" stroke="#22d3ee" strokeWidth="1.5" /><line x1="50" y1="96" x2="67" y2="80" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="15" y1="85" x2="33" y2="80" stroke="#22d3ee" strokeWidth="1.5" /><line x1="15" y1="85" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="33" y1="80" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="85" y1="85" x2="67" y2="80" stroke="#22d3ee" strokeWidth="1.5" /><line x1="85" y1="85" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" /><line x1="67" y1="80" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                {[{cx:50,cy:4,r:3},{cx:50,cy:96,r:3},{cx:4,cy:50,r:3},{cx:96,cy:50,r:3},{cx:15,cy:15,r:2.5},{cx:85,cy:15,r:2.5},{cx:15,cy:85,r:2.5},{cx:85,cy:85,r:2.5},{cx:33,cy:20,r:2},{cx:67,cy:20,r:2},{cx:33,cy:80,r:2},{cx:67,cy:80,r:2}].map((d,i)=><circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#22d3ee"/>)}
              </svg>
              <p style={{ fontSize: 48, fontWeight: 800, marginTop: 24, lineHeight: 1.2 }}><span style={{ color: '#fff' }}>ORION </span><span style={{ color: '#06b6d4' }}>Recruitment</span></p>
              <p className="text-slate-500 text-lg mt-4">Seu sucesso é o nosso sucesso.</p>
              <div style={{ marginTop: 32 }}>
                <p style={{ color: '#94a3b8', fontSize: 16, letterSpacing: '0.05em' }}>Proposta Comercial Exclusiva para:</p>
                <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nome da Empresa"
                  style={{ color: '#06b6d4', fontSize: 28, fontWeight: 700, marginTop: 8, background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', width: '100%' }}
                  onFocus={e => { e.target.style.outline = '1px solid rgba(6,182,212,0.4)'; e.target.style.borderRadius = '4px'; }}
                  onBlur={e => { e.target.style.outline = 'none'; }} />
              </div>
            </div>

            {/* ── Slide 2: Compromisso ── */}
            <div className="proposal-slide">
              <div style={gridPattern} />
              <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 40 }}><span style={{ color: '#fff' }}>Nosso </span><span style={{ color: '#06b6d4' }}>Compromisso</span></h2>
              <div className="flex-1 flex items-center">
                <div className="grid grid-cols-2 gap-8 w-full">
                  <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700/50">
                    <p className="text-xl font-bold text-cyan-400 mb-3">💎 Atenção Exclusiva</p>
                    <p className="text-slate-300 leading-relaxed">Nós trabalhamos <strong className="text-cyan-300">{exclusividade}</strong>. Isso garante que nossos consultores especialistas dediquem 100% de seu foco, rede de contatos e inteligência artificial para mapear os melhores talentos do mercado para o seu desafio específico.</p>
                  </div>
                  <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700/50">
                    <p className="text-xl font-bold text-cyan-400 mb-3">⏱ Velocidade (SLA)</p>
                    <p className="text-slate-300 leading-relaxed">O mercado não espera. Nosso Acordo de Nível de Serviço (SLA) garante a entrega e apresentação dos primeiros candidatos hiper-qualificados, já validados tanto tecnicamente quanto culturalmente, em um prazo de <strong className="text-cyan-300">{sla}</strong>.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Slide 3: Especialidades ── */}
            <div className="proposal-slide">
              <div style={gridPattern} />
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 32 }}>Especialistas, não Generalistas.</h2>
              <div className="flex-1 flex items-center">
                <div className="grid grid-cols-5 gap-4 w-full">
                  {specs.map(item => (
                    <div key={item.title} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3"><span className="text-xl">{item.icon}</span></div>
                      <p className="font-bold text-cyan-400 text-sm mb-2">{item.title}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Slides Extras (Completa) ── */}
            {proposalMode === 'completa' && (
              <>
                {/* Quem Somos */}
                <div className="proposal-slide">
                  <div style={gridPattern} />
                  <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}><span style={{ color: '#fff' }}>Quem é a </span><span style={{ color: '#06b6d4' }}>Orion?</span></h2>
                  <div className="flex-1 flex items-center">
                    <div className="flex gap-10 w-full">
                      <div className="flex-1 space-y-5">
                        <p className="text-slate-300 leading-relaxed text-base">{aboutText1}</p>
                        <p className="text-slate-300 leading-relaxed text-base">{aboutText2}</p>
                        <div className="grid grid-cols-4 gap-4 mt-6">
                          {aboutNumbers.map((n, i) => (
                            <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
                              <p className="text-2xl font-black text-cyan-400">{n.value}</p>
                              <p className="text-slate-400 text-xs mt-1">{n.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diferenciais */}
                <div className="proposal-slide">
                  <div style={gridPattern} />
                  <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}><span style={{ color: '#fff' }}>Por que a </span><span style={{ color: '#06b6d4' }}>Orion?</span></h2>
                  <div className="flex-1 flex items-center">
                    <div className="grid grid-cols-2 gap-6 w-full">
                      {differentials.map((d, i) => (
                        <div key={i} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-lg">{d.icon}</div>
                            <p className="text-lg font-bold text-cyan-400">{d.title}</p>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed">{d.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metodologia */}
                <div className="proposal-slide">
                  <div style={gridPattern} />
                  <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}><span style={{ color: '#fff' }}>Nossa </span><span style={{ color: '#06b6d4' }}>Metodologia</span></h2>
                  <div className="flex-1 flex items-center">
                    <div className="flex flex-col gap-4 w-full">
                      {methodology.map((m, i) => (
                        <div key={i} className="flex items-center gap-5 bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                          <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-700/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-400 font-black text-lg">{m.step}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-white text-base">{m.title}</p>
                            <p className="text-slate-400 text-sm">{m.desc}</p>
                          </div>
                          <span className="text-cyan-400/60 text-xs font-mono flex-shrink-0">{m.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modelo de Trabalho */}
                <div className="proposal-slide">
                  <div style={gridPattern} />
                  <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}><span style={{ color: '#fff' }}>Modelo de </span><span style={{ color: '#06b6d4' }}>Trabalho</span></h2>
                  <div className="flex-1 flex items-center">
                    <div className="grid grid-cols-3 gap-6 w-full">
                      {workModel.map((w, i) => (
                        <div key={i} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-lg">{w.icon}</div>
                          <p className="font-bold text-cyan-400 text-base">{w.title}</p>
                          <p className="text-slate-300 text-sm leading-relaxed">{w.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Slide: Investimento ── */}
            <div className="proposal-slide">
              <div style={gridPattern} />
              <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}><span style={{ color: '#fff' }}>Modelo de </span><span style={{ color: '#06b6d4' }}>Investimento</span></h2>
              <div className="flex-1 flex items-center">
                {feeModel === 'remuneracao_anual' ? (
                  paymentModel === 'sucesso' ? (
                    <div className="flex gap-10 w-full items-center highlight-numbers-layout">
                      <div><p className="text-7xl font-black text-cyan-400">{feePercentual}</p><p className="text-slate-400 mt-2 text-lg">Fee sobre Remuneração Anual</p></div>
                      <div className="flex-1 space-y-4">
                        <h3 className="text-2xl font-bold text-white">Sem Custos Antecipados</h3>
                        <p className="text-slate-300 leading-relaxed">Nossa parceria é pautada estritamente no resultado. O investimento ocorre <strong className="text-white">apenas em caso de sucesso</strong> na contratação.</p>
                        <p className="text-slate-300 leading-relaxed">O honorário é calculado como uma <strong className="text-white">taxa percentual sobre a remuneração anual total</strong> do colaborador contratado.</p>
                        <div className="bg-slate-800/50 rounded-xl p-5 border border-cyan-700/30">
                          <p className="text-cyan-400 font-bold text-sm mb-2">📐 Fórmula de Cálculo</p>
                          <p className="text-white font-mono text-lg"><span className="text-cyan-400">{feePercentual}</span><span className="text-slate-400"> × </span>(<span className="text-slate-300">Rem. Mensal</span><span className="text-slate-400"> × </span><span className="text-cyan-400">{contractTypeProposal === 'CLT' ? '13,33' : '12'}</span><span className="text-slate-400"> + </span><span className="text-slate-300">Bônus Anual</span>)</p>
                          <p className="text-slate-400 text-xs mt-2">{contractTypeProposal === 'CLT' ? 'Multiplicador 13,33 contempla 13º salário e férias proporcionais (regime CLT).' : 'Multiplicador 12 referente aos 12 meses do contrato (regime PJ).'}</p>
                        </div>
                        <div className="border-t border-slate-700/50 pt-4 mt-4">
                          <p className="text-slate-400 text-sm">* <strong className="text-slate-300">Garantia de Reposição de {garantia}:</strong> Refazemos todo o trabalho de hunting sem custo adicional caso haja saída ou desligamento do profissional neste período.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-6">
                      <h3 className="text-2xl font-bold text-white">Comprometimento Compartilhado</h3>
                      <div className="bg-slate-800/50 rounded-xl p-5 border border-cyan-700/30 mb-4">
                        <p className="text-cyan-400 font-bold text-sm mb-2">📐 Fórmula de Cálculo do Honorário</p>
                        <p className="text-white font-mono text-lg"><span className="text-cyan-400">{feePercentual}</span><span className="text-slate-400"> × </span>(<span className="text-slate-300">Rem. Mensal</span><span className="text-slate-400"> × </span><span className="text-cyan-400">{contractTypeProposal === 'CLT' ? '13,33' : '12'}</span><span className="text-slate-400"> + </span><span className="text-slate-300">Bônus Anual</span>)</p>
                        <p className="text-slate-400 text-xs mt-2">{contractTypeProposal === 'CLT' ? 'Multiplicador 13,33 contempla 13º salário e férias proporcionais (regime CLT).' : 'Multiplicador 12 referente aos 12 meses do contrato (regime PJ).'}</p>
                      </div>
                      <div className={`grid ${retainerType === '3x' ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-cyan-700/30 text-center"><p className="text-4xl font-black text-cyan-400">{feeP1}</p><p className="text-white font-bold mt-2">Upfront (Kick-off)</p><p className="text-slate-400 text-sm mt-2">Faturamento no início do projeto.</p></div>
                        {retainerType === '3x' && <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 text-center"><p className="text-4xl font-black text-cyan-400">{feeP2}</p><p className="text-white font-bold mt-2">Shortlist</p><p className="text-slate-400 text-sm mt-2">Apresentação dos finalistas validados.</p></div>}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 text-center"><p className="text-4xl font-black text-cyan-400">{feeP3}</p><p className="text-white font-bold mt-2">Success Fee</p><p className="text-slate-400 text-sm mt-2">Faturamento final na contratação.</p></div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                        <p className="text-slate-300 text-sm">Fee: <strong className="text-cyan-400">{feePercentual}</strong> da remuneração anual ({contractTypeProposal}) | Garantia: <strong className="text-cyan-400">{garantia}</strong></p>
                      </div>
                    </div>
                  )
                ) : (
                  paymentModel === 'sucesso' ? (
                    <div className="flex gap-10 w-full items-center highlight-numbers-layout">
                      <div><p className="text-7xl font-black text-cyan-400">{fee}</p><p className="text-slate-400 mt-2 text-lg">Honorário no Sucesso</p></div>
                      <div className="flex-1 space-y-4">
                        <h3 className="text-2xl font-bold text-white">Sem Custos Antecipados</h3>
                        <p className="text-slate-300 leading-relaxed">Nossa parceria é pautada estritamente no resultado. O investimento ocorre <strong className="text-white">apenas em caso de sucesso</strong> na contratação.</p>
                        <p className="text-slate-300 leading-relaxed">O valor do honorário é equivalente a <strong className="text-white">{fee} da remuneração mensal bruta</strong> acordada com o profissional escolhido.</p>
                        <div className="border-t border-slate-700/50 pt-4 mt-4">
                          <p className="text-slate-400 text-sm">* <strong className="text-slate-300">Garantia de Reposição de {garantia}:</strong> Refazemos todo o trabalho de hunting sem custo adicional caso haja saída ou desligamento do profissional neste período.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-6">
                      <h3 className="text-2xl font-bold text-white">Comprometimento Compartilhado</h3>
                      <div className={`grid ${retainerType === '3x' ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-cyan-700/30 text-center"><p className="text-4xl font-black text-cyan-400">{feeP1}</p><p className="text-white font-bold mt-2">Upfront (Kick-off)</p><p className="text-slate-400 text-sm mt-2">Faturamento no início do projeto, garantindo a dedicação exclusiva da equipe.</p></div>
                        {retainerType === '3x' && <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 text-center"><p className="text-4xl font-black text-cyan-400">{feeP2}</p><p className="text-white font-bold mt-2">Shortlist</p><p className="text-slate-400 text-sm mt-2">Apresentação dos finalistas validados técnica e culturalmente.</p></div>}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 text-center"><p className="text-4xl font-black text-cyan-400">{feeP3}</p><p className="text-white font-bold mt-2">Success Fee</p><p className="text-slate-400 text-sm mt-2">Faturamento final apenas na aprovação e contratação do talento.</p></div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                        <p className="text-slate-300 text-sm">Honorário Total: <strong className="text-cyan-400">{fee}</strong> da remuneração | Garantia: <strong className="text-cyan-400">{garantia}</strong></p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ── Slides: Cases de Sucesso (auto-paginados) ── */}
            {showCases && cases.filter(c => c.name || c.logoUrl).length > 0 && (() => {
              const validCases = cases.filter(c => c.name || c.logoUrl);
              const segments = [...new Set(validCases.map(c => c.segment || 'Outros'))];

              // Build segment columns: each segment becomes a column with up to 3 items
              const segmentColumns = segments.map(seg => ({
                seg,
                items: validCases.filter(c => (c.segment || 'Outros') === seg).slice(0, 6),
              }));

              // Split segment columns into sub-columns of max 3 items each
              const allColumns: { seg: string; items: typeof validCases; subIndex: number }[] = [];
              segmentColumns.forEach(({ seg, items }) => {
                const chunks = Math.ceil(items.length / 3);
                for (let ch = 0; ch < chunks; ch++) {
                  allColumns.push({ seg, items: items.slice(ch * 3, ch * 3 + 3), subIndex: ch });
                }
              });

              // Paginate: max 5 columns per slide to fit within slide width
              const MAX_COLS_PER_SLIDE = 5;
              const slidePages: typeof allColumns[] = [];
              for (let i = 0; i < allColumns.length; i += MAX_COLS_PER_SLIDE) {
                slidePages.push(allColumns.slice(i, i + MAX_COLS_PER_SLIDE));
              }

              return slidePages.map((pageCols, pageIdx) => (
                <div key={`cases-${pageIdx}`} className="proposal-slide">
                  <div style={gridPattern} />
                  <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}>
                    <span style={{ color: '#fff' }}>Cases de </span><span style={{ color: '#06b6d4' }}>Sucesso</span>
                    {slidePages.length > 1 && <span className="text-slate-500 text-lg font-normal ml-3">({pageIdx + 1}/{slidePages.length})</span>}
                  </h2>
                  <p className="text-slate-400 text-base mb-8">Empresas que confiam na Orion para recrutar seus talentos estratégicos.</p>
                  <div className="flex-1 flex items-center">
                    <div className="w-full">
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 24, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                        {pageCols.map((col, ci) => (
                          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 0', minWidth: 140, maxWidth: 220 }}>
                            {col.subIndex === 0 && (
                              <p className="text-cyan-400 font-bold text-xs uppercase tracking-wider" style={{ marginBottom: 4 }}>{col.seg}</p>
                            )}
                            {col.subIndex > 0 && (
                              <p className="text-slate-600 text-[10px] uppercase tracking-wider" style={{ marginBottom: 4 }}>{col.seg} (cont.)</p>
                            )}
                            {col.items.map((c, i) => (
                              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center" style={{ minHeight: 75 }}>
                                {c.logoUrl ? (
                                  <img src={c.logoUrl} alt={c.name} style={{ maxHeight: 36, maxWidth: 120, objectFit: 'contain', marginBottom: 6 }} crossOrigin="anonymous" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                ) : null}
                                {c.name && <p className="text-slate-300 text-xs text-center font-medium">{c.name}</p>}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}

            {/* ── Slide: CTA ── */}
            <div className="proposal-slide" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const }}>
              <div style={gridPattern} />
              <h2 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.2 }}><span style={{ color: '#fff' }}>Vamos </span><span style={{ color: '#06b6d4' }}>transformar</span><span style={{ color: '#fff' }}> seu time?</span></h2>
              <p className="text-slate-400 text-lg mb-8 mt-4 max-w-xl">Estamos prontos para assumir seus desafios mais complexos de contratação.</p>
              <div className="bg-slate-800/50 border border-cyan-800/30 rounded-full px-8 py-3">
                <span className="text-cyan-400 font-semibold">orionrecruitment.com.br</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Retainer Inputs (extracted to avoid duplication) ──
function RetainerInputs({ retainerType, onRetainerChange, feeP1, setFeeP1, feeP2, setFeeP2, feeP3, setFeeP3 }: {
  retainerType: string; onRetainerChange: (v: string) => void;
  feeP1: string; setFeeP1: (v: string) => void;
  feeP2: string; setFeeP2: (v: string) => void;
  feeP3: string; setFeeP3: (v: string) => void;
}) {
  const sm = "w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs";
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 space-y-3 border border-slate-700/50">
      <div><label className="text-xs text-slate-400 mb-1 block">Qtd. de Parcelas</label>
        <select value={retainerType} onChange={e => onRetainerChange(e.target.value)} className={sm + ' text-white cursor-pointer appearance-none focus:border-cyan-500 focus:outline-none'}>
          <option value="3x">3x (Upfront, Shortlist, Sucesso)</option><option value="2x">2x (Upfront, Sucesso)</option>
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1"><label className="text-[10px] text-slate-500 block mb-1">Upfront</label><input value={feeP1} onChange={e => setFeeP1(e.target.value)} className={sm + ' text-cyan-400 text-center font-bold'} /></div>
        {retainerType === '3x' && <div className="flex-1"><label className="text-[10px] text-slate-500 block mb-1">Shortlist</label><input value={feeP2} onChange={e => setFeeP2(e.target.value)} className={sm + ' text-cyan-400 text-center font-bold'} /></div>}
        <div className="flex-1"><label className="text-[10px] text-slate-500 block mb-1">Sucesso</label><input value={feeP3} onChange={e => setFeeP3(e.target.value)} className={sm + ' text-cyan-400 text-center font-bold'} /></div>
      </div>
    </div>
  );
}
