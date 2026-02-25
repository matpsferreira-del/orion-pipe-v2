import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, User } from 'lucide-react';

interface ShortlistCandidate {
  name: string;
  current_role: string | null;
  ai_summary: string | null;
  ai_deliveries: string[] | null;
  ai_background: string[] | null;
  salary_expectation: string | null;
  ai_error?: string | null;
}

interface ShortlistState {
  candidates: ShortlistCandidate[];
  jobTitle: string;
  companyName: string;
}

export default function ShortlistPresentation() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ShortlistState | null;
  const candidates = state?.candidates || [];
  const jobTitle = state?.jobTitle || 'Título da Posição';
  const companyName = state?.companyName || 'Nome do Cliente';

  if (!state || candidates.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <p className="text-xl">Nenhum candidato na shortlist.</p>
          <button onClick={() => navigate(-1)} className="text-cyan-400 hover:underline">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 py-8">
      <style>{`
        @media print {
          @page { size: 1280px 720px; margin: 0; }
          body, html { width: 100%; height: 100%; margin: 0; padding: 0; background: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .slide-container { margin: 0 !important; border-radius: 0 !important; border: none !important; page-break-after: always; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ACTION BAR */}
      <div className="no-print max-w-[1280px] mx-auto mb-6 px-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-cyan-400 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para a Vaga
        </button>
        <p className="text-slate-500 text-sm hidden md:block">
          Dica: Você pode clicar nos textos dos slides para editar antes de imprimir.
        </p>
        <button
          onClick={() => window.print()}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-2 px-6 rounded-lg flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> Exportar PDF
        </button>
      </div>

      <div className="flex flex-col items-center gap-10">
        {/* SLIDE 1: CAPA */}
        <div className="slide-container w-[1280px] h-[720px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.1),transparent_50%)]" />
          <div className="relative z-10 text-center space-y-6">
            <p
              className="text-cyan-400 text-lg font-semibold tracking-[0.3em] uppercase"
              contentEditable
              suppressContentEditableWarning
            >
              {companyName}
            </p>
            <h1 className="text-white text-5xl font-bold tracking-tight">
              Apresentação de Shortlist
            </h1>
            <p
              className="text-slate-300 text-2xl"
              contentEditable
              suppressContentEditableWarning
            >
              {jobTitle}
            </p>
            <p className="text-slate-500 text-sm mt-8">
              Mapeamento e Curadoria por Orion Recruitment
            </p>
          </div>
        </div>

        {/* SLIDE 2: FUNIL */}
        <div className="slide-container w-[1280px] h-[720px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col items-center justify-center p-16 relative overflow-hidden">
          <h2 className="text-white text-3xl font-bold mb-12">Executive Search Overview</h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 w-full max-w-4xl">
            <p className="text-slate-400 text-center mb-10">
              Abaixo apresentamos o funil de atração e triagem para esta posição.
            </p>
            <div className="flex items-end justify-center gap-8">
              {[
                { value: '145', label: 'Mapeados', h: 'h-40', color: 'from-slate-600 to-slate-700' },
                { value: '42', label: 'Abordados', h: 'h-32', color: 'from-slate-500 to-slate-600' },
                { value: String(candidates.length * 4 || 12), label: 'Entrevistados', h: 'h-24', color: 'from-cyan-700 to-cyan-800' },
                { value: String(candidates.length || 3), label: 'Finalistas', h: 'h-16', color: 'from-cyan-500 to-cyan-600' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span
                    className="text-white text-2xl font-bold"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {item.value}
                  </span>
                  <div className={`w-36 ${item.h} bg-gradient-to-t ${item.color} rounded-lg`} />
                  <span className="text-slate-400 text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SLIDES DOS CANDIDATOS */}
        {candidates.map((cand, idx) => (
          <div
            key={idx}
            className="slide-container w-[1280px] h-[720px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col p-12 relative overflow-hidden"
          >
            <h3 className="text-cyan-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Candidato 0{idx + 1}
            </h3>
            <div className="flex gap-8 flex-1">
              {/* LEFT: Avatar + Name */}
              <div className="w-56 flex flex-col items-center pt-4 gap-4">
                <div className="w-32 h-32 rounded-full bg-slate-700 border-2 border-cyan-500/30 flex items-center justify-center">
                  <User className="w-16 h-16 text-slate-500" />
                </div>
                <h4
                  className="text-white text-xl font-bold text-center"
                  contentEditable
                  suppressContentEditableWarning
                >
                  {cand.name || 'Nome do Candidato'}
                </h4>
                <p
                  className="text-cyan-400 text-sm text-center"
                  contentEditable
                  suppressContentEditableWarning
                >
                  {cand.current_role || 'Cargo Atual'}
                </p>
              </div>

              {/* RIGHT: Details */}
              <div className="flex-1 flex flex-col gap-5">
                {/* Summary */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                  <p
                    className="text-slate-300 text-sm leading-relaxed"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {cand.ai_summary ||
                      'Resumo executivo gerado pela IA. Profissional com X anos de experiência na área...'}
                  </p>
                </div>

                {/* Deliveries + Background */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                    <h5 className="text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-3">
                      Principais Entregas
                    </h5>
                    <div className="space-y-2">
                      {(cand.ai_deliveries || ['Resultado A', 'Resultado B', 'Resultado C']).map(
                        (item, i) => (
                          <p
                            key={i}
                            className="text-slate-300 text-sm"
                            contentEditable
                            suppressContentEditableWarning
                          >
                            ◆ {item}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                    <h5 className="text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-3">
                      Background & Skills
                    </h5>
                    <div className="space-y-2">
                      {(cand.ai_background || ['Formação A', 'Skill B', 'Idioma C']).map(
                        (item, i) => (
                          <p
                            key={i}
                            className="text-slate-300 text-sm"
                            contentEditable
                            suppressContentEditableWarning
                          >
                            ◆ {item}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Salary */}
                <div className="bg-slate-800/60 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-4">
                  <span className="text-cyan-400 text-xs font-semibold tracking-wider uppercase">
                    Expectativa Salarial
                  </span>
                  <span
                    className="text-white text-lg font-bold"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {cand.salary_expectation || 'A Combinar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* SLIDE FINAL: NEXT STEPS */}
        <div className="slide-container w-[1280px] h-[720px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden">
          <div className="text-center space-y-8 max-w-2xl">
            <h2 className="text-white text-4xl font-bold">Próximos Passos</h2>
            <p className="text-slate-300 text-lg">
              Recomendamos o agendamento de entrevistas com os finalistas apresentados.
            </p>
            <p className="text-slate-400">
              Por favor, informe-nos as suas disponibilidades de agenda para os próximos dias.
            </p>
            <div className="inline-block bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 font-bold py-3 px-8 rounded-full text-lg">
              Avançar com Entrevistas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
