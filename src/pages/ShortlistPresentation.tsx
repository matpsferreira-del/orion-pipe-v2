import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, User, Download, Loader2 } from 'lucide-react';
import pptxgen from 'pptxgenjs';

interface ShortlistCandidate {
  name: string;
  current_role: string | null;
  photo_url: string | null;
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

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function generatePptx(candidates: ShortlistCandidate[], jobTitle: string, companyName: string, photoDataMap: Record<number, string>) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Orion Recruitment';
  pres.title = `Shortlist - ${jobTitle}`;

  const BG = '0F172A';
  const BG2 = '1E293B';
  const CYAN = '06B6D4';
  const WHITE = 'FFFFFF';
  const GRAY300 = 'CBD5E1';
  const GRAY400 = '94A3B8';
  const GRAY500 = '64748B';
  const GRAY700 = '334155';

  // SLIDE 1: CAPA
  const s1 = pres.addSlide();
  s1.background = { color: BG };
  s1.addText(companyName.toUpperCase(), { x: 0.5, y: 1.5, w: 9, h: 0.5, align: 'center', fontSize: 14, color: CYAN, fontFace: 'Arial', charSpacing: 6, bold: true });
  s1.addText('Apresentação de Shortlist', { x: 0.5, y: 2.1, w: 9, h: 0.8, align: 'center', fontSize: 36, color: WHITE, fontFace: 'Arial', bold: true });
  s1.addText(jobTitle, { x: 0.5, y: 3.0, w: 9, h: 0.5, align: 'center', fontSize: 20, color: GRAY300, fontFace: 'Arial' });
  s1.addText('Mapeamento e Curadoria por Orion Recruitment', { x: 0.5, y: 4.2, w: 9, h: 0.4, align: 'center', fontSize: 10, color: GRAY500, fontFace: 'Arial' });

  // SLIDE 2: FUNIL
  const s2 = pres.addSlide();
  s2.background = { color: BG };
  s2.addText('Executive Search Overview', { x: 0.5, y: 0.4, w: 9, h: 0.6, align: 'center', fontSize: 24, color: WHITE, fontFace: 'Arial', bold: true });
  s2.addText('Abaixo apresentamos o funil de atração e triagem para esta posição.', { x: 1, y: 1.1, w: 8, h: 0.4, align: 'center', fontSize: 12, color: GRAY400, fontFace: 'Arial' });

  const funnelData = [
    { value: '145', label: 'Mapeados', h: 3.0, color: GRAY700 },
    { value: '42', label: 'Abordados', h: 2.4, color: GRAY500 },
    { value: String(candidates.length * 4 || 12), label: 'Entrevistados', h: 1.8, color: '0E7490' },
    { value: String(candidates.length || 3), label: 'Finalistas', h: 1.2, color: CYAN },
  ];

  funnelData.forEach((item, i) => {
    const x = 1.5 + i * 2;
    const barY = 4.6 - item.h;
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: barY, w: 1.5, h: item.h, fill: { color: item.color }, rectRadius: 0.08 });
    s2.addText(item.value, { x, y: barY - 0.45, w: 1.5, h: 0.4, align: 'center', fontSize: 18, color: WHITE, fontFace: 'Arial', bold: true });
    s2.addText(item.label, { x, y: 4.7, w: 1.5, h: 0.35, align: 'center', fontSize: 10, color: GRAY400, fontFace: 'Arial' });
  });

  // CANDIDATE SLIDES
  candidates.forEach((cand, idx) => {
    const slide = pres.addSlide();
    slide.background = { color: BG };

    slide.addText(`CANDIDATO 0${idx + 1}`, { x: 0.6, y: 0.3, w: 4, h: 0.35, fontSize: 10, color: CYAN, fontFace: 'Arial', bold: true, charSpacing: 4 });

    // Photo or placeholder
    const photoData = photoDataMap[idx];
    if (photoData) {
      slide.addImage({ data: photoData, x: 0.6, y: 0.8, w: 1.6, h: 1.6, rounding: true });
    } else {
      slide.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.8, w: 1.6, h: 1.6, fill: { color: GRAY700 }, line: { color: CYAN, width: 1.5, transparency: 70 } });
      slide.addText('👤', { x: 0.6, y: 1.2, w: 1.6, h: 0.8, align: 'center', fontSize: 32 });
    }

    slide.addText(cand.name || 'Nome do Candidato', { x: 0.3, y: 2.6, w: 2.2, h: 0.45, align: 'center', fontSize: 14, color: WHITE, fontFace: 'Arial', bold: true });
    slide.addText(cand.current_role || 'Cargo Atual', { x: 0.3, y: 3.05, w: 2.2, h: 0.35, align: 'center', fontSize: 10, color: CYAN, fontFace: 'Arial' });

    // Summary box
    const summaryText = cand.ai_summary || 'Resumo executivo gerado pela IA.';
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.8, y: 0.7, w: 6.8, h: 1.3, fill: { color: BG2 }, line: { color: GRAY700, width: 0.5 }, rectRadius: 0.08 });
    slide.addText(summaryText, { x: 3.0, y: 0.8, w: 6.4, h: 1.1, fontSize: 10, color: GRAY300, fontFace: 'Arial', valign: 'top', wrap: true });

    // Deliveries
    const deliveries = cand.ai_deliveries || ['Resultado A', 'Resultado B', 'Resultado C'];
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.8, y: 2.15, w: 3.3, h: 2.0, fill: { color: BG2 }, line: { color: GRAY700, width: 0.5 }, rectRadius: 0.08 });
    slide.addText('PRINCIPAIS ENTREGAS', { x: 3.0, y: 2.25, w: 3.0, h: 0.3, fontSize: 8, color: CYAN, fontFace: 'Arial', bold: true, charSpacing: 3 });
    const delTexts = deliveries.map((d, i) => ({
      text: `◆ ${d}`,
      options: { fontSize: 9, color: GRAY300, fontFace: 'Arial', breakLine: i < deliveries.length - 1 } as any,
    }));
    slide.addText(delTexts, { x: 3.0, y: 2.6, w: 2.9, h: 1.4, valign: 'top' });

    // Background
    const background = cand.ai_background || ['Formação A', 'Skill B', 'Idioma C'];
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 2.15, w: 3.3, h: 2.0, fill: { color: BG2 }, line: { color: GRAY700, width: 0.5 }, rectRadius: 0.08 });
    slide.addText('BACKGROUND & SKILLS', { x: 6.5, y: 2.25, w: 3.0, h: 0.3, fontSize: 8, color: CYAN, fontFace: 'Arial', bold: true, charSpacing: 3 });
    const bgTexts = background.map((b, i) => ({
      text: `◆ ${b}`,
      options: { fontSize: 9, color: GRAY300, fontFace: 'Arial', breakLine: i < background.length - 1 } as any,
    }));
    slide.addText(bgTexts, { x: 6.5, y: 2.6, w: 2.9, h: 1.4, valign: 'top' });

    // Salary
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.8, y: 4.35, w: 6.8, h: 0.55, fill: { color: BG2 }, line: { color: '0E7490', width: 0.5, transparency: 60 }, rectRadius: 0.06 });
    slide.addText('EXPECTATIVA SALARIAL', { x: 3.0, y: 4.38, w: 2.5, h: 0.5, fontSize: 8, color: CYAN, fontFace: 'Arial', bold: true, charSpacing: 3, valign: 'middle' });
    slide.addText(cand.salary_expectation || 'A Combinar', { x: 5.5, y: 4.38, w: 4.0, h: 0.5, fontSize: 14, color: WHITE, fontFace: 'Arial', bold: true, valign: 'middle' });
  });

  // SLIDE FINAL
  const sF = pres.addSlide();
  sF.background = { color: BG };
  sF.addText('Próximos Passos', { x: 1, y: 1.5, w: 8, h: 0.7, align: 'center', fontSize: 32, color: WHITE, fontFace: 'Arial', bold: true });
  sF.addText('Recomendamos o agendamento de entrevistas com os finalistas apresentados.', { x: 1.5, y: 2.5, w: 7, h: 0.5, align: 'center', fontSize: 14, color: GRAY300, fontFace: 'Arial' });
  sF.addText('Por favor, informe-nos as suas disponibilidades de agenda para os próximos dias.', { x: 1.5, y: 3.1, w: 7, h: 0.5, align: 'center', fontSize: 12, color: GRAY400, fontFace: 'Arial' });
  sF.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3, y: 4.0, w: 4, h: 0.6, fill: { color: CYAN }, rectRadius: 0.3 });
  sF.addText('Avançar com Entrevistas', { x: 3, y: 4.0, w: 4, h: 0.6, align: 'center', fontSize: 14, color: BG, fontFace: 'Arial', bold: true, valign: 'middle' });

  return pres;
}

export default function ShortlistPresentation() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ShortlistState | null;
  const candidates = state?.candidates || [];
  const jobTitle = state?.jobTitle || 'Título da Posição';
  const companyName = state?.companyName || 'Nome do Cliente';
  const [exportingPptx, setExportingPptx] = useState(false);

  const handleExportPptx = async () => {
    setExportingPptx(true);
    try {
      // Pre-fetch all candidate photos as base64
      const photoDataMap: Record<number, string> = {};
      await Promise.all(
        candidates.map(async (cand, idx) => {
          if (cand.photo_url) {
            const data = await fetchImageAsBase64(cand.photo_url);
            if (data) photoDataMap[idx] = data;
          }
        })
      );

      const pres = generatePptx(candidates, jobTitle, companyName, photoDataMap);
      await pres.writeFile({ fileName: `Shortlist_${jobTitle.replace(/\s+/g, '_')}.pptx` });
    } catch (err) {
      console.error('PPTX export error:', err);
    } finally {
      setExportingPptx(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPptx}
            disabled={exportingPptx}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-900 font-bold py-2 px-5 rounded-lg flex items-center gap-2"
          >
            {exportingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar PPT
          </button>
          <button
            onClick={() => window.print()}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-2 px-6 rounded-lg flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-10">
        {/* SLIDE 1: CAPA */}
        <div className="slide-container w-[1280px] h-[720px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.1),transparent_50%)]" />
          <div className="relative z-10 text-center space-y-6">
            <p className="text-cyan-400 text-lg font-semibold tracking-[0.3em] uppercase" contentEditable suppressContentEditableWarning>
              {companyName}
            </p>
            <h1 className="text-white text-5xl font-bold tracking-tight">
              Apresentação de Shortlist
            </h1>
            <p className="text-slate-300 text-2xl" contentEditable suppressContentEditableWarning>
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
                  <span className="text-white text-2xl font-bold" contentEditable suppressContentEditableWarning>
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
                {cand.photo_url ? (
                  <img
                    src={cand.photo_url}
                    alt={cand.name}
                    className="w-32 h-32 rounded-full object-cover border-2 border-cyan-500/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-32 h-32 rounded-full bg-slate-700 border-2 border-cyan-500/30 flex items-center justify-center ${cand.photo_url ? 'hidden' : ''}`}>
                  <User className="w-16 h-16 text-slate-500" />
                </div>
                <h4 className="text-white text-xl font-bold text-center" contentEditable suppressContentEditableWarning>
                  {cand.name || 'Nome do Candidato'}
                </h4>
                <p className="text-cyan-400 text-sm text-center" contentEditable suppressContentEditableWarning>
                  {cand.current_role || 'Cargo Atual'}
                </p>
              </div>

              {/* RIGHT: Details */}
              <div className="flex-1 flex flex-col gap-5">
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                  <p className="text-slate-300 text-sm leading-relaxed" contentEditable suppressContentEditableWarning>
                    {cand.ai_summary || 'Resumo executivo gerado pela IA.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                    <h5 className="text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-3">
                      Principais Entregas
                    </h5>
                    <div className="space-y-2">
                      {(cand.ai_deliveries || ['Resultado A', 'Resultado B', 'Resultado C']).map((item, i) => (
                        <p key={i} className="text-slate-300 text-sm" contentEditable suppressContentEditableWarning>
                          ◆ {item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                    <h5 className="text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-3">
                      Background & Skills
                    </h5>
                    <div className="space-y-2">
                      {(cand.ai_background || ['Formação A', 'Skill B', 'Idioma C']).map((item, i) => (
                        <p key={i} className="text-slate-300 text-sm" contentEditable suppressContentEditableWarning>
                          ◆ {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-4">
                  <span className="text-cyan-400 text-xs font-semibold tracking-wider uppercase">
                    Expectativa Salarial
                  </span>
                  <span className="text-white text-lg font-bold" contentEditable suppressContentEditableWarning>
                    {cand.salary_expectation || 'A Combinar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* SLIDE FINAL */}
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
