import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Download, FileDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/useCompanies';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import orionLogo from '@/assets/orion-logo.png';

export default function ProposalGenerator() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('opportunities').
      select('*').
      eq('id', id!).
      single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.id === opportunity?.company_id);

  const [empresa, setEmpresa] = useState('');
  const [sla, setSla] = useState('10 a 12 dias úteis');
  const [exclusividade, setExclusividade] = useState('com exclusividade no processo');
  const [garantia, setGarantia] = useState('30 dias');
  const [fee, setFee] = useState('100%');
  const [paymentModel, setPaymentModel] = useState('sucesso');
  const [retainerType, setRetainerType] = useState('3x');
  const [feeP1, setFeeP1] = useState('30%');
  const [feeP2, setFeeP2] = useState('30%');
  const [feeP3, setFeeP3] = useState('40%');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!opportunity) return;
    setEmpresa(company?.nome_fantasia || '');
    setSla(opportunity.proposal_sla || '10 a 12 dias úteis');
    setExclusividade(opportunity.proposal_exclusivity || 'com exclusividade no processo');
    setGarantia(opportunity.proposal_guarantee || '30 dias');
    setFee(opportunity.proposal_fee || '100%');
    setPaymentModel(opportunity.proposal_payment_model || 'sucesso');
    setRetainerType(opportunity.proposal_retainer_type || '3x');
    setFeeP1(opportunity.proposal_fee_p1 || '30%');
    setFeeP2(opportunity.proposal_fee_p2 || '30%');
    setFeeP3(opportunity.proposal_fee_p3 || '40%');
  }, [opportunity, company]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.
      from('opportunities').
      update({
        proposal_sla: sla,
        proposal_exclusivity: exclusividade,
        proposal_guarantee: garantia,
        proposal_fee: fee,
        proposal_payment_model: paymentModel,
        proposal_retainer_type: retainerType,
        proposal_fee_p1: feeP1,
        proposal_fee_p2: feeP2,
        proposal_fee_p3: feeP3
      }).
      eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Padrões salvos com sucesso!');
    },
    onError: (err: Error) => toast.error('Erro ao salvar: ' + err.message)
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
    const originalHeight = wrapperRef.current.scrollHeight;
    containerRef.current.style.height = `${originalHeight * scale}px`;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', scaleSlides);
    const timer = setTimeout(scaleSlides, 150);
    return () => {
      window.removeEventListener('resize', scaleSlides);
      clearTimeout(timer);
    };
  }, [scaleSlides, paymentModel, retainerType]);

  const handleRetainerChange = (val: string) => {
    setRetainerType(val);
    if (val === '2x') {
      setFeeP1('50%');
      setFeeP3('50%');
    } else {
      setFeeP1('30%');
      setFeeP2('30%');
      setFeeP3('40%');
    }
  };

  const handleExportPDF = async () => {
    const slides = document.querySelectorAll('.proposal-slide') as NodeListOf<HTMLElement>;
    if (slides.length === 0) return;

    setIsExporting(true);
    toast.info('Gerando PDF...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1280, 720]
      });

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        // Save original styles
        const origBorderRadius = slide.style.borderRadius;
        const origBoxShadow = slide.style.boxShadow;
        const origBorder = slide.style.border;

        // Temporarily remove decorative styles for clean capture
        slide.style.borderRadius = '0';
        slide.style.boxShadow = 'none';
        slide.style.border = 'none';

        const dataUrl = await toPng(slide, {
          width: 1280,
          height: 720,
          pixelRatio: 2,
          backgroundColor: '#0f172a'
        });

        // Restore original styles
        slide.style.borderRadius = origBorderRadius;
        slide.style.boxShadow = origBoxShadow;
        slide.style.border = origBorder;

        if (i > 0) pdf.addPage([1280, 720], 'landscape');
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1280, 720);
      }

      const filename = empresa ?
      `Orion_Recruitment_-_Proposta_${empresa.replace(/\s+/g, '_')}.pdf` :
      'Orion_Recruitment_-_Proposta_Comercial.pdf';
      pdf.save(filename);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPT = async () => {
    const slides = document.querySelectorAll('.proposal-slide') as NodeListOf<HTMLElement>;
    if (slides.length === 0) return;

    setIsExporting(true);
    toast.info('Gerando PPT...');

    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        const origBorderRadius = slide.style.borderRadius;
        const origBoxShadow = slide.style.boxShadow;
        const origBorder = slide.style.border;

        slide.style.borderRadius = '0';
        slide.style.boxShadow = 'none';
        slide.style.border = 'none';

        const dataUrl = await toPng(slide, {
          width: 1280,
          height: 720,
          pixelRatio: 2,
          backgroundColor: '#0f172a'
        });

        slide.style.borderRadius = origBorderRadius;
        slide.style.boxShadow = origBoxShadow;
        slide.style.border = origBorder;

        const pptSlide = pres.addSlide();
        pptSlide.background = { color: '0f172a' };
        pptSlide.addImage({
          data: dataUrl,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%'
        });
      }

      const filename = empresa ?
      `Orion_Recruitment_-_Proposta_${empresa.replace(/\s+/g, '_')}` :
      'Orion_Recruitment_-_Proposta_Comercial';
      await pres.writeFile({ fileName: `${filename}.pptx` });
      toast.success('PPT exportado com sucesso!');
    } catch (err) {
      console.error('PPT export error:', err);
      toast.error('Erro ao gerar PPT. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>);

  }

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
          body, html { width: 1280px !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; overflow: visible !important; display: block !important; }
          #proposal-sidebar { display: none !important; }
          #proposal-preview-pane { width: 1280px !important; height: auto !important; padding: 0 !important; overflow: visible !important; background: transparent !important; display: block !important; }
          #proposal-scale-container { height: auto !important; display: block !important; }
          #proposal-scale-wrapper { transform: none !important; width: 1280px !important; margin: 0 !important; gap: 0 !important; display: block !important; }
          .proposal-slide { width: 1280px !important; height: 720px !important; margin: 0 !important; border-radius: 0 !important; border: none !important; page-break-after: always; break-after: page; box-shadow: none !important; }
        }
      `}</style>

      {/* SIDEBAR */}
      <div id="proposal-sidebar" className="w-full md:w-[380px] bg-slate-900/80 border-r border-slate-700/50 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-5 border-b border-slate-700/50">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-cyan-400 flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para Oportunidade
          </button>
          <h2 className="text-xl font-bold text-white">CRM | Proposta</h2>
          <p className="text-slate-400 text-xs mt-1">Configure os dados. A proposta atualiza ao lado.</p>
        </div>

        <div className="p-5 space-y-4 flex-1">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Cliente / Empresa</label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none text-sm shadow-inner" />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">SLA de Entrega</label>
            <input value={sla} onChange={(e) => setSla(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none text-sm shadow-inner" />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Exclusividade</label>
            <select value={exclusividade} onChange={(e) => setExclusividade(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none text-sm cursor-pointer appearance-none shadow-inner">
              <option value="com exclusividade no processo">Sim (Com Exclusividade)</option>
              <option value="sem exclusividade no processo">Não (Sem Exclusividade)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Período de Garantia</label>
            <select value={garantia} onChange={(e) => setGarantia(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none text-sm cursor-pointer appearance-none shadow-inner">
              <option value="30 dias">30 dias</option>
              <option value="45 dias">45 dias</option>
              <option value="60 dias">60 dias</option>
              <option value="90 dias">90 dias</option>
            </select>
          </div>

          <hr className="border-slate-700/50" />

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Honorário Total (Base)</label>
              <div className="flex items-center gap-2">
                <input value={fee} onChange={(e) => setFee(e.target.value)} className="w-24 bg-slate-900 border border-cyan-700/50 rounded-lg p-3 text-white font-bold focus:border-cyan-500 focus:outline-none text-sm text-center shadow-inner" />
                <span className="text-slate-400 text-xs">da remuneração</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Modelo de Pagamento</label>
              <select value={paymentModel} onChange={(e) => setPaymentModel(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none text-sm cursor-pointer appearance-none shadow-inner">
                <option value="sucesso">100% no Sucesso</option>
                <option value="retainer">Retainer (Parcelado)</option>
              </select>
            </div>

            {paymentModel === 'retainer' &&
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-3 border border-slate-700/50">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Qtd. de Parcelas</label>
                  <select value={retainerType} onChange={(e) => handleRetainerChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white focus:border-cyan-500 focus:outline-none text-xs appearance-none cursor-pointer">
                    <option value="3x">3x (Upfront, Shortlist, Sucesso)</option>
                    <option value="2x">2x (Upfront, Sucesso)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-1">Upfront</label>
                    <input value={feeP1} onChange={(e) => setFeeP1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-cyan-400 text-center text-xs font-bold" />
                  </div>
                  {retainerType === '3x' &&
                <div className="flex-1">
                      <label className="text-[10px] text-slate-500 block mb-1">Shortlist</label>
                      <input value={feeP2} onChange={(e) => setFeeP2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-cyan-400 text-center text-xs font-bold" />
                    </div>
                }
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-1">Sucesso</label>
                    <input value={feeP3} onChange={(e) => setFeeP3(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-cyan-400 text-center text-xs font-bold" />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <div className="p-5 border-t border-slate-700/50 space-y-2">
          <button onClick={() => saveMutation.mutate()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-all flex justify-center items-center gap-2 text-sm">
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Padrões'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 rounded-lg transition-all shadow-lg flex justify-center items-center gap-2 text-sm disabled:opacity-50">

            {isExporting ?
            <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> :

            <><Download className="h-4 w-4" /> Exportar PDF</>
            }
          </button>
          <button
            onClick={handleExportPPT}
            disabled={isExporting}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-lg transition-all shadow-lg flex justify-center items-center gap-2 text-sm disabled:opacity-50">

            {isExporting ?
            <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> :

            <><FileDown className="h-4 w-4" /> Exportar PPT</>
            }
          </button>
        </div>
      </div>

      {/* PREVIEW */}
      <div id="proposal-preview-pane" ref={paneRef} className="flex-1 overflow-y-auto p-6 bg-[#020617]">
        <div id="proposal-scale-container" ref={containerRef} className="origin-top-left">
          <div id="proposal-scale-wrapper" ref={wrapperRef} className="flex flex-col gap-8 origin-top-left" style={{ width: 1280 }}>

            {/* Slide 1 — Cover (matches standard) */}
            <div className="proposal-slide" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' as const }} />
              
              
               <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                 {/* Outer circle */}
                 <circle cx="50" cy="50" r="46" stroke="#22d3ee" strokeWidth="2.5" />
                 {/* Inner oval */}
                 <ellipse cx="50" cy="50" rx="20" ry="34" stroke="#22d3ee" strokeWidth="2.5" />
                 
                 {/* Facet lines - upper crown (top of diamond) */}
                 {/* Top center to upper-left oval */}
                 <line x1="50" y1="4" x2="33" y2="20" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="50" y1="4" x2="67" y2="20" stroke="#22d3ee" strokeWidth="1.5" />
                 {/* Upper-left connections */}
                 <line x1="15" y1="15" x2="33" y2="20" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="15" y1="15" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="33" y1="20" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 {/* Upper-right connections */}
                 <line x1="85" y1="15" x2="67" y2="20" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="85" y1="15" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="67" y1="20" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 {/* Left side */}
                 <line x1="4" y1="50" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="15" y1="15" x2="4" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="15" y1="85" x2="4" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 {/* Right side */}
                 <line x1="96" y1="50" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="85" y1="15" x2="96" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="85" y1="85" x2="96" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 
                 {/* Facet lines - lower crown (bottom of diamond) */}
                 <line x1="50" y1="96" x2="33" y2="80" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="50" y1="96" x2="67" y2="80" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="15" y1="85" x2="33" y2="80" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="15" y1="85" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="33" y1="80" x2="30" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="85" y1="85" x2="67" y2="80" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="85" y1="85" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 <line x1="67" y1="80" x2="70" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
                 
                 {/* Dots at circle intersections */}
                 <circle cx="50" cy="4" r="3" fill="#22d3ee" />
                 <circle cx="50" cy="96" r="3" fill="#22d3ee" />
                 <circle cx="4" cy="50" r="3" fill="#22d3ee" />
                 <circle cx="96" cy="50" r="3" fill="#22d3ee" />
                 <circle cx="15" cy="15" r="2.5" fill="#22d3ee" />
                 <circle cx="85" cy="15" r="2.5" fill="#22d3ee" />
                 <circle cx="15" cy="85" r="2.5" fill="#22d3ee" />
                 <circle cx="85" cy="85" r="2.5" fill="#22d3ee" />
                 <circle cx="33" cy="20" r="2" fill="#22d3ee" />
                 <circle cx="67" cy="20" r="2" fill="#22d3ee" />
                 <circle cx="33" cy="80" r="2" fill="#22d3ee" />
                 <circle cx="67" cy="80" r="2" fill="#22d3ee" />
               </svg>
              <p style={{ fontSize: '48px', fontWeight: 800, marginTop: '24px', lineHeight: 1.2 }}>
                <span style={{ color: '#ffffff' }}>ORION </span>
                <span style={{ color: '#06b6d4' }}>Recruitment</span>
              </p>
              <p className="text-slate-500 text-lg mt-4">Seu sucesso é o nosso sucesso.</p>
              <div style={{ marginTop: '32px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '16px', letterSpacing: '0.05em' }}>Proposta Comercial Exclusiva para:</p>
                  <input
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Nome da Empresa"
                    style={{ color: '#06b6d4', fontSize: '28px', fontWeight: 700, marginTop: '8px', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', width: '100%' }}
                    onFocus={(e) => { e.target.style.outline = '1px solid rgba(6,182,212,0.4)'; e.target.style.borderRadius = '4px'; }}
                    onBlur={(e) => { e.target.style.outline = 'none'; }}
                  />
                </div>
            </div>

            {/* Slide 2 — Compromisso */}
            <div className="proposal-slide">
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' as const }} />
              <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '40px' }}>
                <span style={{ color: '#ffffff' }}>Nosso </span>
                <span style={{ color: '#06b6d4' }}>Compromisso</span>
              </h2>
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

            {/* Slide 3 — Especialidades */}
            <div className="proposal-slide">
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' as const }} />
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '32px' }}>Especialistas, não Generalistas.</h2>
              <div className="flex-1 flex items-center">
                <div className="grid grid-cols-5 gap-4 w-full">
                  {[
                  { icon: '💻', title: 'Tecnologia', desc: 'Mapeamento de devs, dados, infra e produto. Liderança técnica de ponta.' },
                  { icon: '⚖️', title: 'Finanças & Jurídico', desc: 'Posições críticas de C-Level, controladoria, tributário e compliance.' },
                  { icon: '⚙️', title: 'Engenharia', desc: 'Líderes de manufatura, supply chain e operações para a indústria.' },
                  { icon: '📈', title: 'Marketing & Sales', desc: 'Estratégia de growth, performance, branding e força de vendas B2B/B2C.' },
                  { icon: '👥', title: 'Recursos Humanos', desc: 'Business partners, talent acquisition e líderes para desenvolvimento humano.' }].
                  map((item) =>
                  <div key={item.title} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
                        <span className="text-xl">{item.icon}</span>
                      </div>
                      <p className="font-bold text-cyan-400 text-sm mb-2">{item.title}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Slide 4 — Investimento */}
            <div className="proposal-slide">
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' as const }} />
              <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '32px' }}>
                <span style={{ color: '#ffffff' }}>Modelo de </span>
                <span style={{ color: '#06b6d4' }}>Investimento</span>
              </h2>
              <div className="flex-1 flex items-center">
                {paymentModel === 'sucesso' ?
                <div className="flex gap-10 w-full items-center highlight-numbers-layout">
                    <div>
                      <p className="text-7xl font-black text-cyan-400">{fee}</p>
                      <p className="text-slate-400 mt-2 text-lg">Honorário no Sucesso</p>
                    </div>
                    <div className="flex-1 space-y-4">
                      <h3 className="text-2xl font-bold text-white">Sem Custos Antecipados</h3>
                      <p className="text-slate-300 leading-relaxed">Nossa parceria é pautada estritamente no resultado. O investimento ocorre <strong className="text-white">apenas em caso de sucesso</strong> na contratação.</p>
                      <p className="text-slate-300 leading-relaxed">O valor do honorário é equivalente a <strong className="text-white">{fee} da remuneração mensal bruta</strong> acordada com o profissional escolhido.</p>
                      <div className="border-t border-slate-700/50 pt-4 mt-4">
                        <p className="text-slate-400 text-sm">* <strong className="text-slate-300">Garantia de Reposição de {garantia}:</strong> O processo não termina na assinatura. Refazemos todo o trabalho de hunting sem nenhum custo adicional caso haja saída ou desligamento do profissional neste período inicial.</p>
                      </div>
                    </div>
                  </div> :

                <div className="w-full space-y-6">
                    <h3 className="text-2xl font-bold text-white">Comprometimento Compartilhado</h3>
                    <div className={`grid ${retainerType === '3x' ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                      <div className="bg-slate-800/50 p-6 rounded-xl border border-cyan-700/30 text-center">
                        <p className="text-4xl font-black text-cyan-400">{feeP1}</p>
                        <p className="text-white font-bold mt-2">Upfront (Kick-off)</p>
                        <p className="text-slate-400 text-sm mt-2">Faturamento no início do projeto, garantindo a dedicação exclusiva da equipe.</p>
                      </div>
                      {retainerType === '3x' &&
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 text-center">
                          <p className="text-4xl font-black text-cyan-400">{feeP2}</p>
                          <p className="text-white font-bold mt-2">Shortlist</p>
                          <p className="text-slate-400 text-sm mt-2">Apresentação dos finalistas validados técnica e culturalmente.</p>
                        </div>
                    }
                      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 text-center">
                        <p className="text-4xl font-black text-cyan-400">{feeP3}</p>
                        <p className="text-white font-bold mt-2">Success Fee</p>
                        <p className="text-slate-400 text-sm mt-2">Faturamento final apenas na aprovação e contratação do talento.</p>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                      <p className="text-slate-300 text-sm">Honorário Total: <strong className="text-cyan-400">{fee}</strong> da remuneração | Garantia de Reposição: <strong className="text-cyan-400">{garantia}</strong></p>
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* Slide 5 — CTA */}
            <div className="proposal-slide" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' as const }} />
              
              <h2 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.2 }}>
                <span style={{ color: '#ffffff' }}>Vamos </span>
                <span style={{ color: '#06b6d4' }}>transformar</span>
                <span style={{ color: '#ffffff' }}> seu time?</span>
              </h2>
              <p className="text-slate-400 text-lg mb-8 mt-4 max-w-xl">Estamos prontos para assumir seus desafios mais complexos de contratação.</p>
              <div className="bg-slate-800/50 border border-cyan-800/30 rounded-full px-8 py-3">
                <span className="text-cyan-400 font-semibold">orionrecruitment.com.br</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>);

}