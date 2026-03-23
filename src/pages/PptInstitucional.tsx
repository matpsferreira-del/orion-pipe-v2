import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Default Data ──
const defaultData = {
  clientName: "",
  contactName: "",
  contactRole: "",
  aboutText: "Somos uma consultoria especializada em recrutamento estratégico com atuação nacional. Unimos inteligência de mercado, hunting ativo e tecnologia para conectar empresas aos profissionais certos — com velocidade, precisão e confidencialidade.",
  aboutNumbers: [
    { value: "500+", label: "Profissionais mapeados anualmente" },
    { value: "12", label: "Dias úteis de SLA médio" },
    { value: "95%", label: "Taxa de aderência cultural" },
    { value: "30", label: "Dias de garantia de reposição" },
  ],
  differentials: [
    { icon: "💎", title: "Exclusividade no Processo", desc: "Cada projeto recebe dedicação integral de um consultor especialista. Sem filas, sem divisão de foco — 100% do nosso esforço é direcionado ao seu desafio." },
    { icon: "🤖", title: "Inteligência Artificial + Hunting", desc: "Utilizamos IA para mapeamento preditivo de candidatos combinada com abordagem humana consultiva. Isso nos permite acessar talentos passivos que outros métodos não alcançam." },
    { icon: "⚡", title: "SLA de 10 a 12 Dias Úteis", desc: "Nosso Acordo de Nível de Serviço garante a apresentação dos primeiros candidatos hiper-qualificados — validados tecnicamente e culturalmente — em até 12 dias úteis." },
    { icon: "🔒", title: "Sigilo Total", desc: "Processos conduzidos com total confidencialidade. Informações sensíveis da empresa e dos candidatos são protegidas em todas as etapas do processo seletivo." },
  ],
  services: [
    { icon: "🔍", title: "Recrutamento & Seleção", desc: "Processos seletivos completos e sob medida: do alinhamento estratégico da posição até a apresentação de uma shortlist de candidatos qualificados, com validação técnica e cultural rigorosa.", details: "Ideal para posições operacionais, táticas e de coordenação." },
    { icon: "🎯", title: "Hunting de Candidatos", desc: "Mapeamento ativo e abordagem direta dos melhores profissionais — incluindo talentos passivos que não estão em busca ativa. Utilizamos LinkedIn Recruiter, IA e nossa rede proprietária.", details: "Indicado para posições estratégicas e de difícil preenchimento." },
    { icon: "📊", title: "Hunting Comercial", desc: "Prospecção estratégica de decisores e empresas-alvo para expansão comercial. Identificamos, mapeamos e conectamos sua empresa aos contatos certos no mercado.", details: "Para empresas que desejam expandir carteira de clientes B2B." },
    { icon: "🚀", title: "Outplacement", desc: "Programa estruturado de transição de carreira para profissionais desligados. Suporte completo com mentoria, reposicionamento de LinkedIn, estratégia de busca e acompanhamento até a recolocação.", details: "Disponível para pessoa física e jurídica (programas corporativos)." },
  ],
  specialties: [
    { icon: "💻", area: "Tecnologia", items: ["Desenvolvedores Full-Stack, Back-End, Front-End", "Engenharia de Dados & Analytics", "Infraestrutura & Cloud (AWS, Azure, GCP)", "Produto & UX/UI Design", "Liderança Técnica (Tech Leads, CTOs)"] },
    { icon: "⚖️", area: "Finanças & Jurídico", items: ["Controladoria & FP&A", "Tributário & Compliance", "Auditoria Interna", "Jurídico Corporativo", "Tesouraria & Relações com Investidores"] },
    { icon: "⚙️", area: "Engenharia & Operações", items: ["Engenharia de Manufatura", "Supply Chain & Logística", "Qualidade & Melhoria Contínua", "PCP & Planejamento", "Gestão de Operações Industriais"] },
    { icon: "📈", area: "Marketing & Comercial", items: ["Growth & Performance Marketing", "Branding & Comunicação", "Força de Vendas B2B/B2C", "Trade Marketing", "E-commerce & Digital"] },
    { icon: "👥", area: "Recursos Humanos", items: ["Business Partners (HRBPs)", "Talent Acquisition", "Desenvolvimento Humano & T&D", "Remuneração & Benefícios", "Relações Trabalhistas"] },
    { icon: "🏢", area: "Administrativo & Geral", items: ["Facilities & Infraestrutura", "Compras & Procurement", "Secretariado Executivo", "Atendimento & Customer Success", "Gestão de Projetos (PMO)"] },
  ],
  methodology: [
    { step: "01", title: "Alinhamento Estratégico", desc: "Imersão completa no desafio: entendemos a cultura da empresa, o contexto da área, o perfil ideal e os critérios eliminatórios.", duration: "Dia 1-2" },
    { step: "02", title: "Mapeamento & Hunting", desc: "Ativação da busca multicanal: LinkedIn Recruiter, base proprietária, IA preditiva e rede de contatos.", duration: "Dia 3-8" },
    { step: "03", title: "Triagem & Validação", desc: "Entrevistas por competência, avaliação técnica sob medida e análise de fit cultural.", duration: "Dia 6-10" },
    { step: "04", title: "Shortlist & Parecer", desc: "Apresentação dos 3-5 candidatos finalistas com parecer individual detalhado.", duration: "Dia 10-12" },
    { step: "05", title: "Acompanhamento & Garantia", desc: "Suporte na negociação, acompanhamento do onboarding e monitoramento nos primeiros 30 dias.", duration: "Pós-contratação" },
  ],
  levels: [
    { level: "Operacional & Assistente", examples: "Assistentes, Auxiliares, Operadores", fee: "70-80%", sla: "8-10 dias" },
    { level: "Analista & Especialista", examples: "Analistas Jr/Pl/Sr, Especialistas Técnicos", fee: "80-100%", sla: "10-12 dias" },
    { level: "Supervisão & Coordenação", examples: "Supervisores, Coordenadores, Team Leads", fee: "100%", sla: "12-15 dias" },
    { level: "Gerência", examples: "Gerentes de Área, Gerentes Regionais", fee: "100-120%", sla: "15-20 dias" },
  ],
  investmentFee: "100%",
  investmentDesc: "da remuneração mensal bruta",
  investmentText: "Nossa parceria é pautada estritamente no resultado. O investimento ocorre apenas em caso de sucesso na contratação — sem taxas antecipadas, sem mensalidades, sem surpresas.",
  guaranteeDays: "30",
  guaranteeText: "Se houver saída ou desligamento do profissional dentro deste período, refazemos todo o trabalho de hunting sem nenhum custo adicional.",
  coverageRegions: [
    { region: "Sul", states: "PR, SC, RS", highlight: true },
    { region: "Sudeste", states: "SP, RJ, MG, ES", highlight: true },
    { region: "Centro-Oeste", states: "DF, GO, MT, MS", highlight: false },
    { region: "Nordeste", states: "BA, PE, CE +6", highlight: false },
    { region: "Norte", states: "AM, PA +5", highlight: false },
  ],
  ctaSubtitle: "Estamos prontos para assumir seus desafios mais complexos de contratação com velocidade, precisão e total comprometimento com o resultado.",
  website: "orionrecruitment.com.br",
  email: "contato@orionrecruitment.com.br",
  phone: "",
};

type SlideData = typeof defaultData;

// ── Brand ──
const B = {
  bg: "#0d1926",
  bgAlt: "#0a1420",
  cyan: "#00e5d0",
  cDim: "rgba(0,229,208,0.06)",
  cBord: "rgba(0,229,208,0.12)",
  cGlow: "rgba(0,229,208,0.04)",
  white: "#ffffff",
  t1: "#c8d6e0",
  t2: "#6b8299",
  t3: "#465a6e",
  cardBg: "rgba(14,30,48,0.5)",
  cardBd: "rgba(0,229,208,0.10)",
  grid: "rgba(0,229,208,0.032)",
  ff: "'DM Sans', sans-serif",
};

// Fixed slide dimensions
const SW = 1920;
const SH = 1080;

// ── SlideFrame with fixed 1920x1080 ──
const SlideFrame = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
  <div style={{
    width: SW, height: SH,
    background: `linear-gradient(180deg,${B.bg},${B.bgAlt})`,
    position: "relative", overflow: "hidden", fontFamily: B.ff,
  }}>
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: `linear-gradient(${B.grid} 1px,transparent 1px),linear-gradient(90deg,${B.grid} 1px,transparent 1px)`,
      backgroundSize: "60px 60px",
    }} />
    <div style={{
      position: "relative", zIndex: 1, height: "100%",
      display: "flex", flexDirection: "column",
      justifyContent: center ? "center" : "flex-start",
      alignItems: center ? "center" : "stretch",
      padding: "60px 90px",
    }}>
      {children}
    </div>
  </div>
);

const Crd = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: B.cardBg, border: `1px solid ${B.cardBd}`, borderRadius: 16, padding: "40px 48px", ...style }}>{children}</div>
);

const ST = ({ w, c }: { w: string; c: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
    <span style={{ color: B.cyan, fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>{w}</span>
    <span style={{ color: B.t2, fontSize: 22 }}>{c}</span>
  </div>
);

// ── Scaled wrapper for rendering in UI ──
const ScaledSlide = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: "100%", position: "relative", paddingBottom: `${(SH / SW) * 100}%` }}>
    <div style={{
      position: "absolute", top: 0, left: 0, width: SW, height: SH,
      transform: `scale(var(--slide-scale, 0.5))`,
      transformOrigin: "top left",
    }}>
      {children}
    </div>
  </div>
);

// ── SLIDES ──

function SlideCover({ data }: { data: SlideData }) {
  return (
    <div style={{
      width: SW, height: SH,
      background: `linear-gradient(135deg, ${B.bg} 0%, #0a1a2e 50%, ${B.bgAlt} 100%)`,
      position: "relative", overflow: "hidden", fontFamily: B.ff,
    }}>
      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${B.grid} 1px,transparent 1px),linear-gradient(90deg,${B.grid} 1px,transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      {/* Decorative cyan glow circle */}
      <div style={{
        position: "absolute", right: -200, top: -200,
        width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,208,0.06) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "absolute", left: -100, bottom: -100,
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,208,0.04) 0%, transparent 70%)",
      }} />
      {/* Left accent line */}
      <div style={{
        position: "absolute", left: 90, top: 120, bottom: 120,
        width: 3, background: `linear-gradient(180deg, transparent, ${B.cyan}, transparent)`, opacity: 0.3,
      }} />
      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1, height: "100%",
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "80px 140px",
      }}>
        {/* Tag */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(0,229,208,0.08)", border: `1px solid rgba(0,229,208,0.2)`,
          borderRadius: 30, padding: "8px 20px", marginBottom: 40, alignSelf: "flex-start",
        }}>
          <span style={{ color: B.cyan, fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
            ORION Recruitment
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 18, color: B.t2, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontWeight: 500 }}>
          Proposta Comercial
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: B.white, lineHeight: 1.1, marginBottom: 20, maxWidth: 1000 }}>
          {data.clientName || "Sua Empresa"}
        </div>

        {/* Divider */}
        <div style={{ width: 80, height: 3, background: B.cyan, borderRadius: 2, marginBottom: 28 }} />

        {/* Contact info */}
        {data.contactName && (
          <div style={{ fontSize: 20, color: B.t1, lineHeight: 1.6 }}>
            A/C {data.contactName}{data.contactRole ? ` — ${data.contactRole}` : ""}
          </div>
        )}

        {/* Tagline bottom */}
        <div style={{
          position: "absolute", bottom: 70, left: 140, right: 140,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ color: B.t3, fontSize: 14, letterSpacing: 1 }}>Seu sucesso é o nosso sucesso.</span>
          <span style={{ color: B.t3, fontSize: 13 }}>orionrecruitment.com.br</span>
        </div>
      </div>
    </div>
  );
}

function SlideAbout({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Quem" c="Somos" />
        <div style={{ color: B.t1, fontSize: 20, lineHeight: 1.8, marginBottom: 40, maxWidth: 1400 }}>{data.aboutText}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
          {data.aboutNumbers.map((n, i) => (
            <div key={i} style={{ textAlign: "center", background: B.cDim, borderRadius: 12, padding: "28px 16px" }}>
              <div style={{ color: B.cyan, fontSize: 40, fontWeight: 800 }}>{n.value}</div>
              <div style={{ color: B.t2, fontSize: 15, marginTop: 8 }}>{n.label}</div>
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideDifferentials({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Nosso" c="Compromisso" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
          {data.differentials.map((d, i) => (
            <div key={i} style={{ background: B.cGlow, border: `1px solid ${B.cBord}`, borderRadius: 12, padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{d.icon}</span>
                <span style={{ color: B.white, fontWeight: 700, fontSize: 22 }}>{d.title}</span>
              </div>
              <div style={{ color: B.t2, fontSize: 16, lineHeight: 1.6 }}>{d.desc}</div>
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideServices({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Nossos" c="Serviços" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {data.services.map((s, i) => (
            <div key={i} style={{ background: B.cGlow, border: `1px solid ${B.cBord}`, borderRadius: 12, padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <span style={{ color: B.white, fontWeight: 700, fontSize: 20 }}>{s.title}</span>
              </div>
              <div style={{ color: B.t1, fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>{s.desc}</div>
              <div style={{ color: B.cyan, fontSize: 14, fontStyle: "italic" }}>{s.details}</div>
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideSpec({ data, half }: { data: SlideData; half: number }) {
  const items = half === 1 ? data.specialties.slice(0, 3) : data.specialties.slice(3, 6);
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Especialidades" c="de Atuação" />
        <div style={{ color: B.t2, fontSize: 16, marginBottom: 24 }}>Nossas verticais de atuação — Parte {half}/2</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {items.map((s, i) => (
            <div key={i} style={{ background: B.cGlow, border: `1px solid ${B.cBord}`, borderRadius: 12, padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <span style={{ color: B.white, fontWeight: 700, fontSize: 20 }}>{s.area}</span>
              </div>
              {s.items.map((it, j) => (
                <div key={j} style={{ color: B.t1, fontSize: 15, lineHeight: 2, display: "flex", gap: 8 }}>
                  <span style={{ color: B.cyan }}>›</span>{it}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideMethodology({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Nossa" c="Metodologia" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.methodology.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, background: B.cGlow, border: `1px solid ${B.cBord}`, borderRadius: 12, padding: "20px 28px" }}>
              <span style={{ color: B.cyan, fontWeight: 800, fontSize: 28, minWidth: 48 }}>{m.step}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: B.white, fontWeight: 700, fontSize: 20 }}>{m.title}</div>
                <div style={{ color: B.t2, fontSize: 15, lineHeight: 1.5, marginTop: 4 }}>{m.desc}</div>
              </div>
              <span style={{ color: B.cyan, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", background: B.cDim, padding: "6px 16px", borderRadius: 20 }}>{m.duration}</span>
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideLevels({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Posições" c="Atendidas" />
        <div style={{ color: B.t2, fontSize: 16, marginBottom: 24 }}>Da base operacional até a gerência — cada nível recebe uma abordagem adequada à complexidade.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.levels.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, background: B.cGlow, border: `1px solid ${B.cBord}`, borderRadius: 12, padding: "22px 28px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: B.white, fontWeight: 700, fontSize: 20 }}>{l.level}</div>
                <div style={{ color: B.t2, fontSize: 15, marginTop: 4 }}>{l.examples}</div>
              </div>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ color: B.cyan, fontWeight: 800, fontSize: 26 }}>{l.fee}</div>
                <div style={{ color: B.t3, fontSize: 13 }}>Honorário</div>
              </div>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ color: B.cyan, fontWeight: 800, fontSize: 26 }}>{l.sla}</div>
                <div style={{ color: B.t3, fontSize: 13 }}>SLA</div>
              </div>
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideInvestment({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Investimento" c="& Garantia" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 40, alignItems: "start" }}>
          <div style={{ background: B.cGlow, border: `1px solid ${B.cBord}`, borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ color: B.cyan, fontSize: 72, fontWeight: 800, lineHeight: 1 }}>{data.investmentFee}</div>
            <div style={{ color: B.t1, fontSize: 18, marginTop: 12 }}>Honorário no Sucesso</div>
          </div>
          <div>
            <div style={{ color: B.white, fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Sem Custos Antecipados</div>
            <div style={{ color: B.t1, fontSize: 17, lineHeight: 1.7, marginBottom: 20 }}>{data.investmentText}</div>
            <div style={{ color: B.t2, fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
              O valor do honorário é equivalente a {data.investmentFee} {data.investmentDesc} acordada com o profissional escolhido.
            </div>
            <div style={{ background: B.cDim, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ color: B.t2, fontSize: 15, lineHeight: 1.6 }}>
                ✦ Garantia de Reposição de {data.guaranteeDays} dias: {data.guaranteeText}
              </div>
            </div>
          </div>
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideCoverage({ data }: { data: SlideData }) {
  return (
    <SlideFrame>
      <Crd style={{ height: "100%" }}>
        <ST w="Cobertura" c="Nacional" />
        <div style={{ color: B.t2, fontSize: 16, marginBottom: 24 }}>Operamos em todo o Brasil com processos híbridos (remoto + presencial), mantendo o mesmo padrão de qualidade e velocidade.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 32 }}>
          {data.coverageRegions.map((r, i) => (
            <div key={i} style={{ textAlign: "center", background: r.highlight ? B.cDim : "transparent", border: `1px solid ${r.highlight ? B.cyan : B.cBord}`, borderRadius: 12, padding: "20px 12px" }}>
              <div style={{ color: r.highlight ? B.cyan : B.t1, fontWeight: 700, fontSize: 20 }}>{r.region}</div>
              <div style={{ color: B.t2, fontSize: 14, marginTop: 6 }}>{r.states}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {[{ v: "26", l: "Estados atendidos + DF" }, { v: "100%", l: "Processos remote-friendly" }, { v: "48h", l: "Kickoff após alinhamento" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: B.cyan, fontSize: 36, fontWeight: 800 }}>{s.v}</div>
              <div style={{ color: B.t2, fontSize: 15 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Crd>
    </SlideFrame>
  );
}

function SlideCTA({ data }: { data: SlideData }) {
  return (
    <SlideFrame center>
      <div style={{ fontSize: 52, fontWeight: 800, color: B.white, marginBottom: 24, textAlign: "center", lineHeight: 1.15 }}>Vamos transformar seu time?</div>
      <div style={{ color: B.t1, fontSize: 20, textAlign: "center", maxWidth: 900, lineHeight: 1.7, marginBottom: 40 }}>{data.ctaSubtitle}</div>
      <div style={{ width: 60, height: 3, background: B.cyan, borderRadius: 2, marginBottom: 32 }} />
      <div style={{ color: B.cyan, fontSize: 22, fontWeight: 700 }}>{data.website}</div>
      {(data.email || data.phone) && (
        <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
          {data.email && <span style={{ color: B.t2, fontSize: 16 }}>{data.email}</span>}
          {data.phone && <span style={{ color: B.t2, fontSize: 16 }}>{data.phone}</span>}
        </div>
      )}
    </SlideFrame>
  );
}

// ── Registry ──
const SLIDES = [
  { id: "cover", label: "Capa", C: SlideCover },
  { id: "about", label: "Quem Somos", C: SlideAbout },
  { id: "diff", label: "Compromisso", C: SlideDifferentials },
  { id: "svc", label: "Serviços", C: SlideServices },
  { id: "spec1", label: "Especialidades 1/2", C: (p: { data: SlideData }) => <SlideSpec data={p.data} half={1} /> },
  { id: "spec2", label: "Especialidades 2/2", C: (p: { data: SlideData }) => <SlideSpec data={p.data} half={2} /> },
  { id: "meth", label: "Metodologia", C: SlideMethodology },
  { id: "lvl", label: "Posições", C: SlideLevels },
  { id: "inv", label: "Investimento", C: SlideInvestment },
  { id: "cov", label: "Cobertura", C: SlideCoverage },
  { id: "cta", label: "CTA Final", C: SlideCTA },
];

// ── Editor Panel ──
function EditorPanel({ data, setData, active }: { data: SlideData; setData: React.Dispatch<React.SetStateAction<SlideData>>; active: string }) {
  const u = (k: keyof SlideData, v: any) => setData(p => ({ ...p, [k]: v }));
  const uA = (k: string, i: number, f: string, v: any) => setData((p: any) => { const a = [...p[k]]; a[i] = { ...a[i], [f]: v }; return { ...p, [k]: a }; });
  const uI = (k: string, i: number, j: number, v: string) => setData((p: any) => { const a = [...p[k]]; const it = [...a[i].items]; it[j] = v; a[i] = { ...a[i], items: it }; return { ...p, [k]: a }; });

  const inputCls = "w-full px-2 py-1.5 text-xs bg-background border border-border rounded text-foreground";
  const textCls = inputCls + " h-16 resize-y";
  const labelCls = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 block";

  const panels: Record<string, () => React.ReactNode> = {
    cover: () => <>
      <div className="mb-2"><label className={labelCls}>Nome do Cliente</label><input className={inputCls} value={data.clientName} onChange={e => u("clientName", e.target.value)} placeholder="Ex: Stone, Vivo, Ambev..." /></div>
      <div className="mb-2"><label className={labelCls}>Contato</label><input className={inputCls} value={data.contactName} onChange={e => u("contactName", e.target.value)} placeholder="Opcional" /></div>
      <div className="mb-2"><label className={labelCls}>Cargo</label><input className={inputCls} value={data.contactRole} onChange={e => u("contactRole", e.target.value)} placeholder="Opcional" /></div>
    </>,
    about: () => <>
      <div className="mb-2"><label className={labelCls}>Texto institucional</label><textarea className={textCls} value={data.aboutText} onChange={e => u("aboutText", e.target.value)} /></div>
      <hr className="my-2 border-border" />
      {data.aboutNumbers.map((n, i) => (
        <div key={i} className="flex gap-1 mb-1">
          <input className={inputCls + " !w-14"} value={n.value} onChange={e => uA("aboutNumbers", i, "value", e.target.value)} />
          <input className={inputCls} value={n.label} onChange={e => uA("aboutNumbers", i, "label", e.target.value)} />
        </div>
      ))}
    </>,
    diff: () => data.differentials.map((d, i) => (
      <div key={i}>{i > 0 && <hr className="my-2 border-border" />}<label className={labelCls}>{d.icon} Diferencial {i + 1}</label>
        <input className={inputCls + " mb-1"} value={d.title} onChange={e => uA("differentials", i, "title", e.target.value)} />
        <textarea className={textCls + " !h-12"} value={d.desc} onChange={e => uA("differentials", i, "desc", e.target.value)} />
      </div>
    )),
    svc: () => data.services.map((s, i) => (
      <div key={i}>{i > 0 && <hr className="my-2 border-border" />}<label className={labelCls}>{s.icon} {s.title}</label>
        <input className={inputCls + " mb-1"} value={s.title} onChange={e => uA("services", i, "title", e.target.value)} />
        <textarea className={textCls + " !h-11"} value={s.desc} onChange={e => uA("services", i, "desc", e.target.value)} />
        <input className={inputCls + " mt-1"} value={s.details} onChange={e => uA("services", i, "details", e.target.value)} placeholder="Detalhe..." />
      </div>
    )),
    spec1: () => data.specialties.slice(0, 3).map((s, i) => (
      <div key={i}>{i > 0 && <hr className="my-2 border-border" />}<label className={labelCls}>{s.icon} {s.area}</label>
        <input className={inputCls + " mb-1"} value={s.area} onChange={e => uA("specialties", i, "area", e.target.value)} />
        {s.items.map((it, j) => <input key={j} className={inputCls + " mb-0.5 !text-[10px]"} value={it} onChange={e => uI("specialties", i, j, e.target.value)} />)}
      </div>
    )),
    spec2: () => data.specialties.slice(3, 6).map((s, ri) => {
      const i = ri + 3;
      return (
        <div key={i}>{ri > 0 && <hr className="my-2 border-border" />}<label className={labelCls}>{s.icon} {s.area}</label>
          <input className={inputCls + " mb-1"} value={s.area} onChange={e => uA("specialties", i, "area", e.target.value)} />
          {s.items.map((it, j) => <input key={j} className={inputCls + " mb-0.5 !text-[10px]"} value={it} onChange={e => uI("specialties", i, j, e.target.value)} />)}
        </div>
      );
    }),
    meth: () => data.methodology.map((m, i) => (
      <div key={i}>{i > 0 && <hr className="my-2 border-border" />}<label className={labelCls}>Etapa {m.step}</label>
        <input className={inputCls + " mb-1"} value={m.title} onChange={e => uA("methodology", i, "title", e.target.value)} />
        <textarea className={textCls + " !h-11"} value={m.desc} onChange={e => uA("methodology", i, "desc", e.target.value)} />
        <input className={inputCls + " !w-20"} value={m.duration} onChange={e => uA("methodology", i, "duration", e.target.value)} placeholder="Prazo" />
      </div>
    )),
    lvl: () => data.levels.map((l, i) => (
      <div key={i}>{i > 0 && <hr className="my-2 border-border" />}<label className={labelCls}>{l.level}</label>
        <input className={inputCls + " mb-0.5"} value={l.level} onChange={e => uA("levels", i, "level", e.target.value)} />
        <input className={inputCls + " mb-0.5"} value={l.examples} onChange={e => uA("levels", i, "examples", e.target.value)} placeholder="Exemplos" />
        <div className="flex gap-1">
          <input className={inputCls} value={l.fee} onChange={e => uA("levels", i, "fee", e.target.value)} placeholder="Fee" />
          <input className={inputCls} value={l.sla} onChange={e => uA("levels", i, "sla", e.target.value)} placeholder="SLA" />
        </div>
      </div>
    )),
    inv: () => <>
      <div className="mb-2"><label className={labelCls}>Fee</label><input className={inputCls} value={data.investmentFee} onChange={e => u("investmentFee", e.target.value)} /></div>
      <div className="mb-2"><label className={labelCls}>Complemento</label><input className={inputCls} value={data.investmentDesc} onChange={e => u("investmentDesc", e.target.value)} /></div>
      <div className="mb-2"><label className={labelCls}>Texto</label><textarea className={textCls} value={data.investmentText} onChange={e => u("investmentText", e.target.value)} /></div>
      <hr className="my-2 border-border" />
      <div className="mb-2"><label className={labelCls}>Dias Garantia</label><input className={inputCls + " !w-14"} value={data.guaranteeDays} onChange={e => u("guaranteeDays", e.target.value)} /></div>
      <div className="mb-2"><label className={labelCls}>Texto Garantia</label><textarea className={textCls} value={data.guaranteeText} onChange={e => u("guaranteeText", e.target.value)} /></div>
    </>,
    cov: () => data.coverageRegions.map((r, i) => (
      <div key={i} className="flex gap-1 items-center mb-1">
        <input className={inputCls + " !w-16"} value={r.region} onChange={e => uA("coverageRegions", i, "region", e.target.value)} />
        <input className={inputCls} value={r.states} onChange={e => uA("coverageRegions", i, "states", e.target.value)} />
        <input type="checkbox" checked={r.highlight} onChange={e => uA("coverageRegions", i, "highlight", e.target.checked)} className="accent-primary" />
      </div>
    )),
    cta: () => <>
      <div className="mb-2"><label className={labelCls}>Subtítulo</label><textarea className={textCls} value={data.ctaSubtitle} onChange={e => u("ctaSubtitle", e.target.value)} /></div>
      <div className="mb-2"><label className={labelCls}>Website</label><input className={inputCls} value={data.website} onChange={e => u("website", e.target.value)} /></div>
      <div className="mb-2"><label className={labelCls}>E-mail</label><input className={inputCls} value={data.email} onChange={e => u("email", e.target.value)} /></div>
      <div className="mb-2"><label className={labelCls}>Telefone</label><input className={inputCls} value={data.phone} onChange={e => u("phone", e.target.value)} placeholder="Opcional" /></div>
    </>,
  };

  const P = panels[active];
  return P ? <>{P()}</> : <p className="text-xs text-muted-foreground">Selecione um slide.</p>;
}

// ── Main Page ──
export default function PptInstitucional() {
  const navigate = useNavigate();
  const [data, setData] = useState(defaultData);
  const [active, setActive] = useState("cover");
  const [visible, setVisible] = useState(SLIDES.map(s => s.id));
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => setVisible(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const aObj = SLIDES.find(s => s.id === active);
  const vis = SLIDES.filter(s => visible.includes(s.id));
  const ci = vis.findIndex(s => s.id === active);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const currentMode = mode;
      setMode("preview");
      await new Promise(r => setTimeout(r, 500));

      const container = previewRef.current;
      if (!container) return;

      const slides = container.querySelectorAll<HTMLElement>('[data-slide]');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [SW, SH] });

      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage([SW, SH], 'landscape');
        const slideInner = slides[i].querySelector<HTMLElement>('[data-slide-inner]') || slides[i];
        const dataUrl = await toPng(slideInner, { quality: 1, pixelRatio: 2, width: SW, height: SH });
        pdf.addImage(dataUrl, 'PNG', 0, 0, SW, SH);
      }

      pdf.save(`PPT_Institucional_Orion${data.clientName ? `_${data.clientName}` : ''}.pdf`);
      setMode(currentMode);
    } finally {
      setExporting(false);
    }
  }, [mode, data.clientName]);

  // Preview mode
  if (mode === "preview") return (
    <div className="min-h-screen" style={{ background: "#070e18", fontFamily: B.ff }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-2" style={{ background: "#0d1926ee", backdropFilter: "blur(10px)", borderBottom: "1px solid #152030" }}>
        <span style={{ color: B.cyan, fontWeight: 700, fontSize: 13 }}>ORION Recruitment — {vis.length} slides</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" />
            {exporting ? "Exportando..." : "Exportar PDF"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode("edit")} style={{ color: B.cyan }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Editor
          </Button>
        </div>
      </div>
      <div ref={previewRef} style={{ maxWidth: 960, margin: "0 auto", padding: "20px 0 70px" }}>
        {vis.map(s => (
          <div key={s.id} data-slide style={{ marginBottom: 16, borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 28px rgba(0,0,0,0.45)" }}>
            <div data-slide-inner>
              <ScaledSlide><s.C data={data} /></ScaledSlide>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Edit mode
  return (
    <div className="flex h-[calc(100vh-64px)]" style={{ fontFamily: B.ff }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />

      {/* LEFT SIDEBAR */}
      <div className="w-52 border-r border-border bg-card flex flex-col overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate('/oportunidades')} className="mb-2 w-full justify-start text-xs">
            <ArrowLeft className="h-3 w-3 mr-1" /> Voltar
          </Button>
          <p className="text-xs font-bold text-foreground">PPT Institucional</p>
          <p className="text-[10px] text-muted-foreground">Presentation Builder</p>
        </div>
        <div className="p-2 flex-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">Slides</p>
          {SLIDES.map(s => {
            const isA = active === s.id, isV = visible.includes(s.id);
            return (
              <div key={s.id} onClick={() => { setActive(s.id); if (!isV) toggle(s.id); }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer mb-0.5 text-xs transition-colors ${isA ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                style={{ opacity: isV ? 1 : 0.3 }}>
                <input type="checkbox" checked={isV} onChange={() => toggle(s.id)} onClick={e => e.stopPropagation()} className="accent-primary w-3 h-3 cursor-pointer" />
                {s.label}
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t border-border space-y-1">
          <Button size="sm" className="w-full text-xs" onClick={() => setMode("preview")}>
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleExport} disabled={exporting}>
            <Download className="h-3 w-3 mr-1" /> {exporting ? "..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* CENTER */}
      <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <Button variant="ghost" size="sm" onClick={() => { if (ci > 0) setActive(vis[ci - 1].id); }} disabled={ci <= 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">{ci + 1} / {vis.length} — {aObj?.label}</span>
          <Button variant="ghost" size="sm" onClick={() => { if (ci < vis.length - 1) setActive(vis[ci + 1].id); }} disabled={ci >= vis.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div
            className="w-full"
            style={{ maxWidth: 800 }}
            ref={(el) => {
              if (el) {
                const scale = Math.min(el.parentElement!.clientWidth / SW, el.parentElement!.clientHeight / SH) * 0.92;
                el.style.setProperty('--slide-scale', String(scale));
              }
            }}
          >
            {aObj && <ScaledSlide><aObj.C data={data} /></ScaledSlide>}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-64 border-l border-border bg-card overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Editando</p>
          <p className="text-sm font-bold text-foreground">{aObj?.label}</p>
        </div>
        <div className="p-3">
          <EditorPanel data={data} setData={setData} active={active} />
        </div>
      </div>
    </div>
  );
}
