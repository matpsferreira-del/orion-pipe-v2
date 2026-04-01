import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOpportunities } from "@/hooks/useOpportunities";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";

const DELIVERABLES_DEFAULT = [
  { id: "strategy", label: "Estratégia de Recolocação Personalizada", desc: "Mapeamento completo do mercado-alvo, definição de empresas prioritárias e plano de ação com cronograma tático de hunting.", included: true, category: "core" },
  { id: "cv", label: "Revisão e Adequação de Currículo", desc: "Reestruturação do currículo com foco em palavras-chave do mercado, narrativa de carreira orientada a resultados e adequação ao cargo-alvo.", included: true, category: "core" },
  { id: "linkedin", label: "Estratégia de LinkedIn", desc: "Otimização completa do perfil, networking inteligente com decisores, abordagens diretas e atração inbound de recrutadores.", included: true, category: "core" },
  { id: "hunting", label: "Hunting Ativo de Vagas", desc: "Busca ativa por vagas publicadas e ocultas via metodologia de prospecção comercial. Acionamento direto do nosso networking estratégico.", included: true, category: "core" },
  { id: "prospecting", label: "Prospecção de Decisores", desc: "Mapeamento, qualificação e abordagem direta de gestores e RHs de empresas-alvo utilizando metodologias de hunting comercial (ICP, cadências multicanal).", included: true, category: "core" },
  { id: "bridge", label: "Ponte e Negociação", desc: "Comunicação direta com decisores das empresas, follow-ups estratégicos constantes para garantir visibilidade e defender seu perfil.", included: true, category: "core" },
  { id: "mentorship", label: "Mentoria Preparatória para Entrevistas", desc: "Simulações práticas (Role Play), defesa de narrativa, estruturação tática dos seus cases de sucesso. Inclui 3 encontros dedicados.", included: true, category: "retainer_only" },
  { id: "meetings", label: "Reuniões de Alinhamento", desc: "Encontros periódicos para revisão de progresso, ajuste de rota e alinhamento de expectativas.", included: true, category: "core", qty: 3, qtyLabel: "reuniões/mês", qtyEditable: true },
  { id: "whatsapp", label: "Canal Aberto via WhatsApp", desc: "Acesso direto para dúvidas rápidas, preparação pré-entrevista e aconselhamento em tempo real.", included: true, category: "core" },
  { id: "followup_report", label: "Relatório de Follow-Up Semanal", desc: "Report semanal com vagas encontradas, contatos mapeados, abordagens realizadas e status das negociações em andamento.", included: true, category: "core" },
  { id: "company_map", label: "Mapa de Empresas-Alvo", desc: "Documento estratégico com empresas prioritárias segmentadas por fit cultural, porte e potencial de contratação para o cargo-alvo.", included: true, category: "core" },
  { id: "guarantee", label: "Garantia de Reposição (45 dias)", desc: "Caso ocorra desligamento durante o período inicial, refazemos todo o trabalho de hunting sem custo adicional.", included: true, category: "core" },
];

interface Deliverable {
  id: string;
  label: string;
  desc: string;
  included: boolean;
  category: string;
  qty?: number;
  qtyLabel?: string;
  qtyEditable?: boolean;
}

interface Config {
  nome: string;
  cargo: string;
  salario: string;
  bonus: string;
  modelo: string;
  retainerFee: string;
  sucessoFee: string;
  retainerEntrada: string;
  retainerSucesso: string;
  showValues: boolean;
  obs: string;
}

function formatBRL(val: number) {
  if (!val && val !== 0) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function parseNumber(str: string) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/50 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className="pr-3">
        <p className="text-xs font-semibold text-white">{label}</p>
        {hint && <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full relative transition-all flex-shrink-0 ${checked ? "bg-cyan-500" : "bg-slate-600"}`}>
        <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm" style={{ left: checked ? 22 : 2 }} />
      </div>
    </div>
  );
}

function EditorPanel({ config, setConfig, deliverables, setDeliverables }: { config: Config; setConfig: (c: Config) => void; deliverables: Deliverable[]; setDeliverables: React.Dispatch<React.SetStateAction<Deliverable[]>> }) {
  const salarioBase = parseNumber(config.salario);
  const bonusAnual = parseNumber(config.bonus);
  const composicao = salarioBase + bonusAnual / 12;
  const retainerPct = parseFloat(config.retainerFee) || 0;
  const sucessoPct = parseFloat(config.sucessoFee) || 0;

  const updateDel = (id: string, field: string, value: any) => {
    setDeliverables((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const L = "block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5";
  const I = "w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all placeholder:text-slate-500";
  const SI = "bg-slate-800/60 border border-slate-600/50 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-400 w-16 text-center";
  const FI = "w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all text-center font-bold text-lg";

  return (
    <div className="space-y-5 p-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Configurador da Proposta</h2>
        <p className="text-xs text-slate-400">Preencha os dados e personalize os entregáveis</p>
      </div>

      <div>
        <label className={L}>Nome do Profissional</label>
        <input className={I} value={config.nome} onChange={(e) => setConfig({ ...config, nome: e.target.value })} placeholder="Ex: Helen Copelli" />
      </div>
      <div>
        <label className={L}>Cargo-Alvo</label>
        <input className={I} value={config.cargo} onChange={(e) => setConfig({ ...config, cargo: e.target.value })} placeholder="Ex: Coordenador(a) de RH" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={L}>Salário Mensal (R$)</label><input className={I} value={config.salario} onChange={(e) => setConfig({ ...config, salario: e.target.value })} placeholder="8.000,00" /></div>
        <div><label className={L}>Bônus Anual (R$)</label><input className={I} value={config.bonus} onChange={(e) => setConfig({ ...config, bonus: e.target.value })} placeholder="24.000,00" /></div>
      </div>

      <Toggle checked={config.showValues} onChange={(v) => setConfig({ ...config, showValues: v })} label="Exibir valores na proposta" hint="Desligado = mostra só os nomes das variáveis, sem cifras." />

      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
        <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">Resumo interno (só você vê)</p>
        <p className="text-cyan-400 text-xl font-bold">{formatBRL(composicao)}<span className="text-xs text-slate-400 font-normal ml-1">/mês</span></p>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/50">
          <div><p className="text-[10px] text-slate-500 uppercase">Retainer ({retainerPct}%)</p><p className="text-emerald-400 font-semibold text-sm">{formatBRL(composicao * retainerPct / 100)}</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase">Sucesso ({sucessoPct}%)</p><p className="text-amber-400 font-semibold text-sm">{formatBRL(composicao * sucessoPct / 100)}</p></div>
        </div>
      </div>

      <div>
        <label className={L}>Modelo de Cobrança</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(["retainer", "sucesso"] as const).map((m) => (
            <button key={m} onClick={() => setConfig({ ...config, modelo: m })} className={`rounded-lg px-3 py-3 text-sm font-semibold transition-all border ${config.modelo === m ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-500"}`}>
              {m === "retainer" ? "Retainer" : "100% Sucesso"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={L}>Fee Retainer (%)</label><div className="relative"><input className={FI} value={config.retainerFee} onChange={(e) => setConfig({ ...config, retainerFee: e.target.value })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-normal">%</span></div></div>
          <div><label className={L}>Fee Sucesso (%)</label><div className="relative"><input className={FI} value={config.sucessoFee} onChange={(e) => setConfig({ ...config, sucessoFee: e.target.value })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-normal">%</span></div></div>
        </div>
        {config.modelo === "retainer" && (
          <div className="mt-3 bg-slate-800/30 rounded-lg p-3 border border-slate-700/40">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Split do Retainer (Entrada / Sucesso)</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>Entrada (%)</label><div className="relative"><input className={FI} value={config.retainerEntrada} onChange={(e) => setConfig({ ...config, retainerEntrada: e.target.value })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-normal">%</span></div></div>
              <div><label className={L}>No Sucesso (%)</label><div className="relative"><input className={FI} value={config.retainerSucesso} onChange={(e) => setConfig({ ...config, retainerSucesso: e.target.value })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-normal">%</span></div></div>
            </div>
            {(parseFloat(config.retainerEntrada) || 0) + (parseFloat(config.retainerSucesso) || 0) !== 100 && (
              <p className="text-[10px] text-amber-400 mt-2 font-medium">Atenção: Entrada + Sucesso deve somar 100%. Atual: {(parseFloat(config.retainerEntrada) || 0) + (parseFloat(config.retainerSucesso) || 0)}%</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className={L}>Entregáveis da Proposta</label>
        <p className="text-[10px] text-slate-500 mb-3">Marque/desmarque para incluir na proposta.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
          {deliverables.map((d) => {
            const ro = d.category === "retainer_only";
            const dis = ro && config.modelo === "sucesso";
            return (
              <div key={d.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${dis ? "opacity-40 border-slate-800" : d.included ? "border-slate-600/50 bg-slate-800/30" : "border-slate-800 bg-transparent"}`}>
                <input type="checkbox" checked={dis ? false : d.included} disabled={dis} onChange={(e) => updateDel(d.id, "included", e.target.checked)} className="mt-0.5 accent-cyan-400 w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white leading-tight">{d.label}</span>
                    {ro && <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-semibold">RETAINER</span>}
                  </div>
                  {d.qtyEditable && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input className={SI} type="number" min={1} max={10} value={d.qty} onChange={(e) => updateDel(d.id, "qty", parseInt(e.target.value) || 1)} />
                      <span className="text-[10px] text-slate-400">{d.qtyLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className={L}>Observações Adicionais</label>
        <textarea className={`${I} resize-none h-20`} value={config.obs} onChange={(e) => setConfig({ ...config, obs: e.target.value })} placeholder="Notas ou condições especiais..." />
      </div>
    </div>
  );
}

function ProposalPreview({ config, deliverables, previewRef }: { config: Config; deliverables: Deliverable[]; previewRef: React.RefObject<HTMLDivElement> }) {
  const salarioBase = parseNumber(config.salario);
  const bonusAnual = parseNumber(config.bonus);
  const composicao = salarioBase + bonusAnual / 12;
  const isRet = config.modelo === "retainer";
  const feePct = isRet ? (parseFloat(config.retainerFee) || 0) : (parseFloat(config.sucessoFee) || 0);
  const fee = composicao * (feePct / 100);
  const sv = config.showValues;
  const rEntrada = parseFloat(config.retainerEntrada) || 25;
  const rSucesso = parseFloat(config.retainerSucesso) || 75;

  const activeDels = deliverables.filter((d) => {
    if (d.category === "retainer_only" && !isRet) return false;
    return d.included;
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const gridBg = `repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(0,200,255,0.03) 39px,rgba(0,200,255,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(0,200,255,0.03) 39px,rgba(0,200,255,0.03) 40px)`;
  const Div = () => <div className="px-8 py-3"><div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" /></div>;

  const Arrow = () => (
    <div className="flex items-center justify-center py-1">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v10m0 0l-3-3m3 3l3-3" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );

  return (
    <div ref={previewRef} className="min-h-full text-white" style={{ fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(170deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%)", backgroundImage: gridBg }}>
      {/* Hidden slide-based sections for PDF export */}
      <div data-pdf-slides-container style={{ position: 'absolute', left: '-9999px', top: 0, width: '900px', pointerEvents: 'none' }}>
        {/* Slide 1: Cover */}
        <div data-pdf-slide style={{ width: '900px', minHeight: '1272px', background: 'linear-gradient(170deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 60px', textAlign: 'center' as const, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' as const }}>
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 44, fontWeight: 900, color: '#fff', margin: 0 }}>ORION <span style={{ color: '#22d3ee' }}>Recruitment</span></h1>
            <p style={{ color: '#94a3b8', fontSize: 15, marginTop: 10, letterSpacing: '0.05em' }}>Seu sucesso é o nosso sucesso.</p>
          </div>
          <div style={{ width: 80, height: 1, background: 'rgba(34,211,238,0.4)', marginBottom: 48 }} />
          <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: 16 }}>Proposta Comercial Exclusiva para</p>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: '#22d3ee', margin: 0 }}>{config.nome || "Nome do Profissional"}</h2>
          {config.cargo && <p style={{ color: '#cbd5e1', fontSize: 18, marginTop: 16 }}>Cargo-Alvo: <strong style={{ color: '#fff' }}>{config.cargo}</strong></p>}
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 40 }}>{dateStr}</p>
        </div>

        {/* Slide 2: Compromisso / Entregáveis */}
        <div data-pdf-slide style={{ width: '900px', minHeight: '1272px', background: 'linear-gradient(170deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%)', padding: '60px', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' as const }}>
          <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 10 }}>Nosso <span style={{ color: '#22d3ee' }}>Compromisso</span></h3>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, maxWidth: 700, marginBottom: 32 }}>Atuamos como seu braço estratégico no mercado. Combinamos metodologias de hunting comercial, prospecção ativa de decisores e inteligência de mercado para posicionar seu perfil diretamente na mesa de quem toma a decisão.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {activeDels.map((d) => (
              <div key={d.id} style={{ border: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.3)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 5px' }}>{d.label}{d.qtyEditable ? ` (${d.qty}x/mês)` : ""}</h4>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{d.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slide 3: Metodologia */}
        <div data-pdf-slide style={{ width: '900px', minHeight: '1272px', background: 'linear-gradient(170deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%)', padding: '60px', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 32 }}>Metodologia <span style={{ color: '#22d3ee' }}>de Trabalho</span></h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { step: "01", title: "Diagnóstico & Estratégia", text: "Análise do perfil, definição do ICP (Perfil de Empresa Ideal), mapeamento de mercado e construção do plano tático de recolocação." },
              { step: "02", title: "Hunting & Prospecção", text: "Ativação de cadências multicanal (LinkedIn, e-mail, telefone) com decisores de empresas-alvo. Follow-ups estratégicos com report semanal." },
              { step: "03", title: "Negociação & Fechamento", text: "Ponte direta com as empresas, preparação para entrevistas, negociação de proposta salarial e acompanhamento até o onboarding." },
            ].map((s) => (
              <div key={s.step} style={{ flex: 1, border: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.3)', borderRadius: 12, padding: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(22,211,238,0.2)' }}>{s.step}</span>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '12px 0' }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Slide 4: Investimento */}
        <div data-pdf-slide style={{ width: '900px', minHeight: '1272px', background: 'linear-gradient(170deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%)', padding: '50px 60px', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' as const }}>
          <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 28 }}>Modelo de <span style={{ color: '#22d3ee' }}>Investimento</span></h3>
          <div style={{ border: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.3)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Como calculamos os honorários</p>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 20 }}>Transparência total: a fee incide apenas sobre a composição salarial do cargo-alvo.</p>
            {/* Step 1 */}
            <div style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 16, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#22d3ee' }}>1</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase' as const }}>Composição Salarial Mensal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' as const }}>
                  <p style={{ fontSize: 9, color: '#22d3ee', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 4 }}>Salário Fixo</p>
                  {sv ? <p style={{ fontSize: 15, color: '#fff', fontWeight: 700, margin: 0 }}>{formatBRL(salarioBase)}</p> : <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>Mensal</p>}
                </div>
                <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 16 }}>+</span>
                <div style={{ flex: 1, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' as const }}>
                  <p style={{ fontSize: 9, color: '#22d3ee', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 4 }}>Bônus Anual ÷ 12</p>
                  {sv ? <p style={{ fontSize: 15, color: '#fff', fontWeight: 700, margin: 0 }}>{formatBRL(bonusAnual / 12)}</p> : <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>Rateado mensal</p>}
                </div>
                <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 16 }}>=</span>
                <div style={{ flex: 1, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' as const }}>
                  <p style={{ fontSize: 9, color: '#22d3ee', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 4 }}>Base Mensal</p>
                  {sv ? <p style={{ fontSize: 17, color: '#22d3ee', fontWeight: 700, margin: 0 }}>{formatBRL(composicao)}</p> : <p style={{ fontSize: 13, color: '#22d3ee', fontWeight: 700, margin: 0 }}>Salário + Bônus/12</p>}
                </div>
              </div>
            </div>
            {/* Arrow */}
            <div style={{ textAlign: 'center' as const, padding: '4px 0' }}><svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v10m0 0l-3-3m3 3l3-3" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            {/* Step 2 */}
            <div style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 16, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#22d3ee' }}>2</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase' as const }}>Aplicação da Fee</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' as const }}>
                  <p style={{ fontSize: 9, color: '#22d3ee', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 4 }}>Base Mensal</p>
                  {sv ? <p style={{ fontSize: 15, color: '#22d3ee', fontWeight: 700, margin: 0 }}>{formatBRL(composicao)}</p> : <p style={{ fontSize: 12, color: '#22d3ee', fontWeight: 700, margin: 0 }}>Composição</p>}
                </div>
                <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 16 }}>×</span>
                <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' as const, minWidth: 80 }}>
                  <p style={{ fontSize: 9, color: '#22d3ee', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 4 }}>Fee</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: isRet ? '#22d3ee' : '#f59e0b', margin: 0 }}>{feePct}%</p>
                </div>
                <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 16 }}>=</span>
                <div style={{ flex: 1, background: isRet ? 'rgba(34,211,238,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${isRet ? 'rgba(34,211,238,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 8, padding: 12, textAlign: 'center' as const }}>
                  <p style={{ fontSize: 9, color: isRet ? '#22d3ee' : '#f59e0b', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 4 }}>Honorário</p>
                  {sv ? <p style={{ fontSize: 18, fontWeight: 900, color: isRet ? '#22d3ee' : '#f59e0b', margin: 0 }}>{formatBRL(fee)}</p> : <p style={{ fontSize: 13, fontWeight: 700, color: isRet ? '#22d3ee' : '#f59e0b', margin: 0 }}>Base × {feePct}%</p>}
                </div>
              </div>
            </div>
            {isRet && (
              <>
                <div style={{ textAlign: 'center' as const, padding: '4px 0' }}><svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v10m0 0l-3-3m3 3l3-3" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <div style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#22d3ee' }}>3</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase' as const }}>Cronograma de Desembolso</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 9, color: '#22d3ee', fontWeight: 600, textTransform: 'uppercase' as const }}>Entrada</span><span style={{ fontSize: 13, color: '#22d3ee', fontWeight: 700 }}>{rEntrada}%</span></div>
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Setup, Estratégia e Mentoria Inicial</p>
                      {sv && <p style={{ fontSize: 13, color: '#fff', fontWeight: 700, margin: '4px 0 0' }}>{formatBRL(fee * rEntrada / 100)}</p>}
                    </div>
                    <div style={{ flex: 1, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 9, color: '#22d3ee', fontWeight: 600, textTransform: 'uppercase' as const }}>No Sucesso</span><span style={{ fontSize: 13, color: '#22d3ee', fontWeight: 700 }}>{rSucesso}%</span></div>
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Aprovação e Fechamento de Contrato</p>
                      {sv && <p style={{ fontSize: 13, color: '#fff', fontWeight: 700, margin: '4px 0 0' }}>{formatBRL(fee * rSucesso / 100)}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Model box */}
          <div style={{ border: `1px solid ${isRet ? 'rgba(34,211,238,0.3)' : 'rgba(245,158,11,0.3)'}`, background: isRet ? 'rgba(34,211,238,0.05)' : 'rgba(245,158,11,0.05)', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{isRet ? "Modelo Retainer" : "Modelo 100% Sucesso"}</h4>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{isRet ? `Inclui Mentoria Preparatória e Estratégia de LinkedIn avançada. Entrada de ${rEntrada}% + ${rSucesso}% no sucesso.` : "Sem custos antecipados. Pagamento integral apenas quando a recolocação acontece."}</p>
            </div>
            <span style={{ fontSize: 48, fontWeight: 900, color: isRet ? '#22d3ee' : '#f59e0b', marginLeft: 16 }}>{feePct}%</span>
          </div>
        </div>

        {/* Slide 5: CTA + Observações */}
        <div data-pdf-slide style={{ width: '900px', minHeight: '1272px', background: 'linear-gradient(170deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%)', padding: '60px', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const }}>
          {config.obs && (
            <div style={{ border: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.3)', borderRadius: 12, padding: 24, marginBottom: 48, textAlign: 'left' as const, width: '100%', maxWidth: 600 }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>Observações</p>
              <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-line' as const, margin: 0 }}>{config.obs}</p>
            </div>
          )}
          <h3 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 14 }}>Pronto para o <span style={{ color: '#22d3ee' }}>próximo passo?</span></h3>
          <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.6 }}>Agradecemos a confiança. Estamos preparados para iniciar imediatamente e assumir o desafio de acelerar sua recolocação.</p>
          <div style={{ display: 'inline-block', border: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.3)', borderRadius: 999, padding: '14px 36px' }}>
            <span style={{ color: '#22d3ee', fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>orionrecruitment.com.br</span>
          </div>
        </div>
      </div>
      {/* Cover */}
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center" style={{ minHeight: 400 }}>
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight">ORION <span className="text-cyan-400">Recruitment</span></h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">Seu sucesso é o nosso sucesso.</p>
        </div>
        <div className="w-16 h-px bg-cyan-400/40 mb-8" />
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Proposta Comercial Exclusiva para</p>
        <h2 className="text-3xl font-bold text-cyan-400">{config.nome || "Nome do Profissional"}</h2>
        {config.cargo && <p className="text-slate-300 text-base mt-3 font-medium">Cargo-Alvo: <span className="text-white font-semibold">{config.cargo}</span></p>}
        <p className="text-slate-500 text-xs mt-6">{dateStr}</p>
      </div>

      <Div />

      {/* Compromisso */}
      <div className="px-8 py-10">
        <h3 className="text-2xl font-black mb-2">Nosso <span className="text-cyan-400">Compromisso</span></h3>
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-8">Atuamos como seu braço estratégico no mercado. Combinamos metodologias de hunting comercial, prospecção ativa de decisores e inteligência de mercado para posicionar seu perfil diretamente na mesa de quem toma a decisão.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeDels.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-5">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{d.label}{d.qtyEditable ? ` (${d.qty}x/mês)` : ""}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Div />

      {/* Metodologia */}
      <div className="px-8 py-10">
        <h3 className="text-2xl font-black mb-6">Metodologia <span className="text-cyan-400">de Trabalho</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Diagnóstico & Estratégia", text: "Análise do perfil, definição do ICP (Perfil de Empresa Ideal), mapeamento de mercado e construção do plano tático de recolocação." },
            { step: "02", title: "Hunting & Prospecção", text: "Ativação de cadências multicanal (LinkedIn, e-mail, telefone) com decisores de empresas-alvo. Follow-ups estratégicos com report semanal." },
            { step: "03", title: "Negociação & Fechamento", text: "Ponte direta com as empresas, preparação para entrevistas, negociação de proposta salarial e acompanhamento até o onboarding." },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-5">
              <span className="text-3xl font-black text-cyan-400/20">{s.step}</span>
              <h4 className="text-sm font-bold text-white mt-2 mb-2">{s.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <Div />

      {/* Investimento */}
      <div className="px-8 py-10">
        <h3 className="text-2xl font-black mb-6">Modelo de <span className="text-cyan-400">Investimento</span></h3>

        <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-6 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Como calculamos os honorários</p>
          <p className="text-[11px] text-slate-500 mb-5">Transparência total: a fee incide apenas sobre a composição salarial do cargo-alvo.</p>

          {/* Step 1 */}
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/30 p-4 mb-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-cyan-400/15 flex items-center justify-center text-[10px] font-bold text-cyan-400 flex-shrink-0">1</span>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Composição Salarial Mensal</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[100px] rounded-lg bg-slate-800/60 border border-slate-600/30 p-3 text-center">
                <p className="text-[9px] text-cyan-400 uppercase font-semibold tracking-wider mb-1">Salário Fixo</p>
                {sv ? <p className="text-white font-bold text-base">{formatBRL(salarioBase)}</p> : <p className="text-slate-300 text-xs font-medium">Mensal</p>}
              </div>
              <span className="text-cyan-400 font-bold text-lg">+</span>
              <div className="flex-1 min-w-[100px] rounded-lg bg-slate-800/60 border border-slate-600/30 p-3 text-center">
                <p className="text-[9px] text-cyan-400 uppercase font-semibold tracking-wider mb-1">Bônus Anual ÷ 12</p>
                {sv ? <p className="text-white font-bold text-base">{formatBRL(bonusAnual / 12)}</p> : <p className="text-slate-300 text-xs font-medium">Rateado mensal</p>}
              </div>
              <span className="text-cyan-400 font-bold text-lg">=</span>
              <div className="flex-1 min-w-[120px] rounded-lg bg-cyan-400/10 border border-cyan-400/30 p-3 text-center">
                <p className="text-[9px] text-cyan-400 uppercase font-semibold tracking-wider mb-1">Base Mensal</p>
                {sv ? <p className="text-cyan-400 font-bold text-lg">{formatBRL(composicao)}</p> : <p className="text-cyan-400 font-bold text-sm">Salário + Bônus/12</p>}
              </div>
            </div>
          </div>

          <Arrow />

          {/* Step 2 */}
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/30 p-4 mb-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-cyan-400/15 flex items-center justify-center text-[10px] font-bold text-cyan-400 flex-shrink-0">2</span>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Aplicação da Fee</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[120px] rounded-lg bg-cyan-400/10 border border-cyan-400/30 p-3 text-center">
                <p className="text-[9px] text-cyan-400 uppercase font-semibold tracking-wider mb-1">Base Mensal</p>
                {sv ? <p className="text-cyan-400 font-bold text-base">{formatBRL(composicao)}</p> : <p className="text-cyan-400 font-bold text-sm">Composição</p>}
              </div>
              <span className="text-cyan-400 font-bold text-lg">×</span>
              <div className="rounded-lg bg-slate-800/60 border border-slate-600/30 p-3 text-center min-w-[80px]">
                <p className="text-[9px] text-cyan-400 uppercase font-semibold tracking-wider mb-1">Fee</p>
                <p className={`font-black text-lg ${isRet ? "text-cyan-400" : "text-amber-400"}`}>{feePct}%</p>
              </div>
              <span className="text-cyan-400 font-bold text-lg">=</span>
              <div className={`flex-1 min-w-[130px] rounded-lg p-3 text-center border ${isRet ? "bg-cyan-400/10 border-cyan-400/30" : "bg-amber-400/10 border-amber-400/30"}`}>
                <p className={`text-[9px] uppercase font-semibold tracking-wider mb-1 ${isRet ? "text-cyan-400" : "text-amber-400"}`}>Honorário</p>
                {sv ? <p className={`font-black text-lg ${isRet ? "text-cyan-400" : "text-amber-400"}`}>{formatBRL(fee)}</p> : <p className={`font-bold text-sm ${isRet ? "text-cyan-400" : "text-amber-400"}`}>Base × {feePct}%</p>}
              </div>
            </div>
          </div>

          {isRet && (
            <>
              <Arrow />
              {/* Step 3 */}
              <div className="rounded-lg bg-slate-700/20 border border-slate-700/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-400/15 flex items-center justify-center text-[10px] font-bold text-cyan-400 flex-shrink-0">3</span>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Cronograma de Desembolso</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[140px] rounded-lg bg-slate-800/60 border border-slate-600/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-cyan-400 uppercase font-semibold">Entrada</span>
                      <span className="text-cyan-400 font-bold text-sm">{rEntrada}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Setup, Estratégia e Mentoria Inicial</p>
                    {sv && <p className="text-white font-bold text-sm mt-1">{formatBRL(fee * rEntrada / 100)}</p>}
                  </div>
                  <div className="flex-1 min-w-[140px] rounded-lg bg-slate-800/60 border border-slate-600/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-cyan-400 uppercase font-semibold">No Sucesso</span>
                      <span className="text-cyan-400 font-bold text-sm">{rSucesso}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Aprovação e Fechamento de Contrato</p>
                    {sv && <p className="text-white font-bold text-sm mt-1">{formatBRL(fee * rSucesso / 100)}</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modelo box */}
        {isRet ? (
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Modelo Retainer</h4>
                <p className="text-xs text-slate-400 mt-1">Inclui Mentoria Preparatória e Estratégia de LinkedIn avançada.</p>
                <p className="text-xs text-slate-400 mt-0.5">Entrada de {rEntrada}% para iniciar + {rSucesso}% no sucesso da recolocação.</p>
              </div>
              <span className="text-5xl font-black text-cyan-400 ml-4">{config.retainerFee}%</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-lg font-bold text-white">Modelo 100% Sucesso</h4>
                <p className="text-xs text-slate-400 mt-1">Sem custos ou taxas antecipadas. Pagamento integral apenas quando a recolocação acontece.</p>
              </div>
              <span className="text-5xl font-black text-amber-400 ml-4">{config.sucessoFee}%</span>
            </div>
            {activeDels.find((d) => d.id === "guarantee") && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 rounded-lg bg-slate-800/30 p-3">
                <p className="text-xs text-slate-300"><span className="text-white font-bold">Garantia (45 dias):</span> Refazemos todo o trabalho de hunting sem custo adicional em caso de saída durante o período inicial.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {config.obs && (
        <>
          <Div />
          <div className="px-8 py-6">
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Observações</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{config.obs}</p>
            </div>
          </div>
        </>
      )}

      <Div />
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <h3 className="text-3xl font-black mb-3">Pronto para o <span className="text-cyan-400">próximo passo?</span></h3>
        <p className="text-slate-400 text-sm max-w-md mb-8">Agradecemos a confiança. Estamos preparados para iniciar imediatamente e assumir o desafio de acelerar sua recolocação.</p>
        <div className="rounded-full border border-slate-600/50 bg-slate-800/30 px-8 py-3">
          <span className="text-cyan-400 text-sm font-bold tracking-widest uppercase">orionrecruitment.com.br</span>
        </div>
      </div>
    </div>
  );
}

function buildExportHTML(config: Config, deliverables: Deliverable[]) {
  const salarioBase = parseNumber(config.salario);
  const bonusAnual = parseNumber(config.bonus);
  const composicao = salarioBase + bonusAnual / 12;
  const isRet = config.modelo === "retainer";
  const feePct = isRet ? (parseFloat(config.retainerFee) || 0) : (parseFloat(config.sucessoFee) || 0);
  const fee = composicao * (feePct / 100);
  const sv = config.showValues;
  const accent = isRet ? "#22d3ee" : "#f59e0b";
  const rEntrada = parseFloat(config.retainerEntrada) || 25;
  const rSucesso = parseFloat(config.retainerSucesso) || 75;

  const activeDels = deliverables.filter((d) => {
    if (d.category === "retainer_only" && !isRet) return false;
    return d.included;
  });

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const delsHtml = activeDels.map(d => `
    <div style="border:1px solid rgba(51,65,85,0.4);background:rgba(15,23,42,0.3);border-radius:12px;padding:20px;break-inside:avoid">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:8px;height:8px;border-radius:50%;background:#22d3ee;margin-top:5px;flex-shrink:0"></div>
        <div>
          <h4 style="font-size:14px;font-weight:700;color:#fff;margin:0 0 6px">${d.label}${d.qtyEditable ? ` (${d.qty}x/mês)` : ""}</h4>
          <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">${d.desc}</p>
        </div>
      </div>
    </div>`).join("\n");

  const stepsHtml = [
    { n: "01", t: "Diagnóstico & Estratégia", d: "Análise do perfil, definição do ICP, mapeamento de mercado e plano tático de recolocação." },
    { n: "02", t: "Hunting & Prospecção", d: "Cadências multicanal com decisores de empresas-alvo. Follow-ups estratégicos com report semanal." },
    { n: "03", t: "Negociação & Fechamento", d: "Ponte direta com empresas, preparação para entrevistas e negociação até o onboarding." },
  ].map(s => `
    <div style="flex:1;border:1px solid rgba(51,65,85,0.4);background:rgba(15,23,42,0.3);border-radius:12px;padding:20px;min-width:200px">
      <span style="font-size:28px;font-weight:900;color:rgba(22,211,238,0.2)">${s.n}</span>
      <h4 style="font-size:13px;font-weight:700;color:#fff;margin:8px 0">${s.t}</h4>
      <p style="font-size:11px;color:#94a3b8;line-height:1.5;margin:0">${s.d}</p>
    </div>`).join("");

  const cronogramaHtml = isRet ? `
    <div style="margin-top:8px;display:flex;justify-content:center">
      <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v10m0 0l-3-3m3 3l3-3" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/></svg>
    </div>
    <div style="background:rgba(51,65,85,0.2);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="width:24px;height:24px;border-radius:50%;background:rgba(34,211,238,0.15);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#22d3ee">3</span>
        <span style="font-size:11px;font-weight:600;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.05em">Cronograma de Desembolso</span>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:rgba(15,23,42,0.6);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:9px;color:#22d3ee;font-weight:600;text-transform:uppercase">Entrada</span><span style="font-size:13px;color:#22d3ee;font-weight:700">${rEntrada}%</span></div>
          <p style="font-size:10px;color:#94a3b8;margin:0">Setup, Estratégia e Mentoria Inicial</p>
          ${sv ? `<p style="font-size:13px;color:#fff;font-weight:700;margin:4px 0 0">${formatBRL(fee * rEntrada / 100)}</p>` : ""}
        </div>
        <div style="flex:1;min-width:140px;background:rgba(15,23,42,0.6);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:9px;color:#22d3ee;font-weight:600;text-transform:uppercase">No Sucesso</span><span style="font-size:13px;color:#22d3ee;font-weight:700">${rSucesso}%</span></div>
          <p style="font-size:10px;color:#94a3b8;margin:0">Aprovação e Fechamento de Contrato</p>
          ${sv ? `<p style="font-size:13px;color:#fff;font-weight:700;margin:4px 0 0">${formatBRL(fee * rSucesso / 100)}</p>` : ""}
        </div>
      </div>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Proposta Orion - ${config.nome || "Profissional"}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#0a1628;color:#fff}
.page{max-width:900px;margin:0 auto;padding:0 32px}
.divider{height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,0.3),transparent);margin:12px 0}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact} .no-print{display:none!important} .page{max-width:100%}}
</style></head><body>
<div style="text-align:right;padding:12px 20px" class="no-print">
  <button onclick="window.print()" style="background:#22d3ee;color:#0a1628;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Imprimir / Salvar PDF</button>
</div>
<div class="page">
  <div style="text-align:center;padding:80px 0">
    <h1 style="font-size:36px;font-weight:900">ORION <span style="color:#22d3ee">Recruitment</span></h1>
    <p style="color:#94a3b8;font-size:13px;margin-top:8px">Seu sucesso é o nosso sucesso.</p>
    <div style="width:60px;height:1px;background:rgba(34,211,238,0.4);margin:32px auto"></div>
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:12px">Proposta Comercial Exclusiva para</p>
    <h2 style="font-size:28px;font-weight:700;color:#22d3ee">${config.nome || "Nome do Profissional"}</h2>
    ${config.cargo ? `<p style="color:#cbd5e1;font-size:14px;margin-top:12px">Cargo-Alvo: <strong style="color:#fff">${config.cargo}</strong></p>` : ""}
    <p style="color:#64748b;font-size:11px;margin-top:24px">${today}</p>
  </div>
  <div class="divider"></div>
  <div style="padding:40px 0">
    <h3 style="font-size:22px;font-weight:900;margin-bottom:8px">Nosso <span style="color:#22d3ee">Compromisso</span></h3>
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;max-width:700px;margin-bottom:32px">Atuamos como seu braço estratégico no mercado.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">${delsHtml}</div>
  </div>
  <div class="divider"></div>
  <div style="padding:40px 0">
    <h3 style="font-size:22px;font-weight:900;margin-bottom:24px">Metodologia <span style="color:#22d3ee">de Trabalho</span></h3>
    <div style="display:flex;gap:16px;flex-wrap:wrap">${stepsHtml}</div>
  </div>
  <div class="divider"></div>
  <div style="padding:40px 0">
    <h3 style="font-size:22px;font-weight:900;margin-bottom:24px">Modelo de <span style="color:#22d3ee">Investimento</span></h3>
    <div style="border:1px solid rgba(51,65,85,0.4);background:rgba(15,23,42,0.3);border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px">Como calculamos os honorários</p>
      <p style="font-size:11px;color:#64748b;margin-bottom:20px">Transparência total: a fee incide apenas sobre a composição salarial do cargo-alvo.</p>
      <div style="background:rgba(51,65,85,0.2);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:16px;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="width:24px;height:24px;border-radius:50%;background:rgba(34,211,238,0.15);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#22d3ee">1</span>
          <span style="font-size:11px;font-weight:600;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.05em">Composição Salarial Mensal</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:100px;background:rgba(15,23,42,0.6);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:9px;color:#22d3ee;text-transform:uppercase;font-weight:600;margin-bottom:4px">Salário Fixo</p>
            ${sv ? `<p style="font-size:15px;color:#fff;font-weight:700">${formatBRL(salarioBase)}</p>` : `<p style="font-size:12px;color:#cbd5e1">Mensal</p>`}
          </div>
          <span style="color:#22d3ee;font-weight:700;font-size:16px">+</span>
          <div style="flex:1;min-width:100px;background:rgba(15,23,42,0.6);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:9px;color:#22d3ee;text-transform:uppercase;font-weight:600;margin-bottom:4px">Bônus Anual ÷ 12</p>
            ${sv ? `<p style="font-size:15px;color:#fff;font-weight:700">${formatBRL(bonusAnual / 12)}</p>` : `<p style="font-size:12px;color:#cbd5e1">Rateado mensal</p>`}
          </div>
          <span style="color:#22d3ee;font-weight:700;font-size:16px">=</span>
          <div style="flex:1;min-width:120px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.3);border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:9px;color:#22d3ee;text-transform:uppercase;font-weight:600;margin-bottom:4px">Base Mensal</p>
            ${sv ? `<p style="font-size:17px;color:#22d3ee;font-weight:700">${formatBRL(composicao)}</p>` : `<p style="font-size:13px;color:#22d3ee;font-weight:700">Salário + Bônus/12</p>`}
          </div>
        </div>
      </div>
      <div style="text-align:center;padding:4px 0"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v10m0 0l-3-3m3 3l3-3" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/></svg></div>
      <div style="background:rgba(51,65,85,0.2);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:16px;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="width:24px;height:24px;border-radius:50%;background:rgba(34,211,238,0.15);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#22d3ee">2</span>
          <span style="font-size:11px;font-weight:600;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.05em">Aplicação da Fee</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:120px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.3);border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:9px;color:#22d3ee;text-transform:uppercase;font-weight:600;margin-bottom:4px">Base Mensal</p>
            ${sv ? `<p style="font-size:15px;color:#22d3ee;font-weight:700">${formatBRL(composicao)}</p>` : `<p style="font-size:12px;color:#22d3ee;font-weight:700">Composição</p>`}
          </div>
          <span style="color:#22d3ee;font-weight:700;font-size:16px">×</span>
          <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(51,65,85,0.3);border-radius:8px;padding:12px;text-align:center;min-width:80px">
            <p style="font-size:9px;color:#22d3ee;text-transform:uppercase;font-weight:600;margin-bottom:4px">Fee</p>
            <p style="font-size:18px;font-weight:900;color:${accent}">${feePct}%</p>
          </div>
          <span style="color:#22d3ee;font-weight:700;font-size:16px">=</span>
          <div style="flex:1;min-width:130px;background:${isRet ? "rgba(34,211,238,0.1)" : "rgba(245,158,11,0.1)"};border:1px solid ${isRet ? "rgba(34,211,238,0.3)" : "rgba(245,158,11,0.3)"};border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:9px;color:${accent};text-transform:uppercase;font-weight:600;margin-bottom:4px">Honorário</p>
            ${sv ? `<p style="font-size:18px;font-weight:900;color:${accent}">${formatBRL(fee)}</p>` : `<p style="font-size:13px;font-weight:700;color:${accent}">Base × ${feePct}%</p>`}
          </div>
        </div>
      </div>
      ${cronogramaHtml}
    </div>
    <div style="border:1px solid ${isRet ? "rgba(34,211,238,0.3)" : "rgba(245,158,11,0.3)"};background:${isRet ? "rgba(34,211,238,0.05)" : "rgba(245,158,11,0.05)"};border-radius:12px;padding:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div>
        <h4 style="font-size:18px;font-weight:700;color:#fff;margin:0">${isRet ? "Modelo Retainer" : "Modelo 100% Sucesso"}</h4>
        <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">${isRet ? `Inclui Mentoria Preparatória e Estratégia de LinkedIn avançada. Entrada de ${rEntrada}% + ${rSucesso}% no sucesso.` : "Sem custos antecipados. Pagamento integral apenas quando a recolocação acontece."}</p>
      </div>
      <span style="font-size:48px;font-weight:900;color:${accent}">${feePct}%</span>
    </div>
  </div>
  ${config.obs ? `<div class="divider"></div><div style="padding:24px 0"><div style="border:1px solid rgba(51,65,85,0.4);background:rgba(15,23,42,0.3);border-radius:12px;padding:20px"><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:8px">Observações</p><p style="font-size:13px;color:#cbd5e1;line-height:1.6;white-space:pre-line">${config.obs}</p></div></div>` : ""}
  <div class="divider"></div>
  <div style="text-align:center;padding:64px 0">
    <h3 style="font-size:28px;font-weight:900">Pronto para o <span style="color:#22d3ee">próximo passo?</span></h3>
    <p style="color:#94a3b8;font-size:13px;max-width:420px;margin:12px auto 32px">Agradecemos a confiança. Estamos preparados para iniciar imediatamente e assumir o desafio de acelerar sua recolocação.</p>
    <div style="display:inline-block;border:1px solid rgba(51,65,85,0.5);background:rgba(15,23,42,0.3);border-radius:999px;padding:12px 32px">
      <span style="color:#22d3ee;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase">orionrecruitment.com.br</span>
    </div>
  </div>
</div></body></html>`;
}

export default function PropostaOutplacement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: opportunities = [], isLoading } = useOpportunities();
  const opportunity = opportunities.find(o => o.id === id);
  
  const pfName = opportunity?.observacoes?.match(/\[PF: (.+?)\]/)?.[1] || '';

  const [config, setConfig] = useState<Config>({
    nome: "", cargo: "", salario: "", bonus: "",
    modelo: "retainer", retainerFee: "30", sucessoFee: "45",
    retainerEntrada: "25", retainerSucesso: "75",
    showValues: true, obs: "",
  });
  const [deliverables, setDeliverables] = useState<Deliverable[]>(DELIVERABLES_DEFAULT);
  const [showPreview, setShowPreview] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill name from opportunity
  if (pfName && !initialized && !config.nome) {
    setConfig(prev => ({ ...prev, nome: pfName }));
    setInitialized(true);
  }

  const handleExport = useCallback(async () => {
    if (!previewRef.current) return;
    setExportMsg("Gerando PDF...");
    try {
      // Capture the preview as a high-res PNG
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a1628',
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });

      const imgW = img.width;
      const imgH = img.height;

      // A4 dimensions in mm
      const pdfW = 210;
      const pdfH = (imgH * pdfW) / imgW;

      const pdf = new jsPDF({
        orientation: pdfH > pdfW * 1.5 ? 'portrait' : 'portrait',
        unit: 'mm',
        format: [pdfW, pdfH],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`Proposta_Orion_${config.nome || 'Outplacement'}.pdf`);
      setExportMsg("PDF baixado com sucesso!");
    } catch (err) {
      console.error('PDF export error:', err);
      setExportMsg("Erro ao gerar PDF. Tente novamente.");
    }
    setTimeout(() => setExportMsg(""), 4000);
  }, [config, deliverables]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-black text-white tracking-tight">ORION <span className="text-cyan-400">Recruitment</span></h1>
          <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider hidden sm:inline">Proposta Outplacement</span>
        </div>
        <div className="flex items-center gap-2">
          {exportMsg && <span className="text-[10px] text-emerald-400 mr-2 hidden md:inline">{exportMsg}</span>}
          <button onClick={() => handleExport()} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-xs font-semibold transition-all border border-cyan-400/30 flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar PDF
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className="md:hidden bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700">
            {showPreview ? "Editar" : "Preview"}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-52px)]">
        <div className={`w-full md:w-96 lg:w-[420px] flex-shrink-0 border-r border-slate-800/60 overflow-y-auto bg-slate-900/50 ${showPreview ? "hidden md:block" : ""}`} style={{ maxHeight: "calc(100vh - 52px)" }}>
          <EditorPanel config={config} setConfig={setConfig} deliverables={deliverables} setDeliverables={setDeliverables} />
        </div>
        <div className={`flex-1 overflow-y-auto ${!showPreview ? "hidden md:block" : ""}`} style={{ maxHeight: "calc(100vh - 52px)" }}>
          <ProposalPreview config={config} deliverables={deliverables} previewRef={previewRef} />
        </div>
      </div>
    </div>
  );
}
