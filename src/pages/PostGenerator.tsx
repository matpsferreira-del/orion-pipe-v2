import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Check, X, Image as ImageIcon, Quote, BarChart2 } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function PostGenerator() {
  const [theme, setTheme] = useState<'artigo' | 'quote' | 'comunicado'>('artigo');
  const [tag, setTag] = useState('Mercado Tech');
  const [title, setTitle] = useState('Como a Inteligência Artificial está a redefinir o Hunting Executivo.');
  const [sub, setSub] = useState('Análise de tendências por Orion Recruitment');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&q=80');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const scaleContainerRef = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Escala Responsiva Absoluta
  useEffect(() => {
    const adjustScale = () => {
      if (!previewContainerRef.current || !scaleContainerRef.current || !scaleWrapperRef.current) return;
      
      const baseSize = 1080;
      const padding = window.innerWidth < 768 ? 40 : 80;
      
      const availableWidth = previewContainerRef.current.clientWidth - padding;
      const availableHeight = previewContainerRef.current.clientHeight - padding;
      
      let scaleWidth = availableWidth / baseSize;
      let scaleHeight = availableHeight / baseSize;
      let scale = Math.min(scaleWidth, scaleHeight);
      
      if (scale > 1) scale = 1;
      
      scaleWrapperRef.current.style.transform = `scale(${scale})`;
      scaleContainerRef.current.style.width = `${baseSize * scale}px`;
      scaleContainerRef.current.style.height = `${baseSize * scale}px`;
    };

    window.addEventListener('resize', adjustScale);
    setTimeout(adjustScale, 100);
    return () => window.removeEventListener('resize', adjustScale);
  }, [theme]);

  // Geração da Imagem com Clone Invisível
  const generateImage = async () => {
    if (!captureRef.current) return;
    
    setIsGenerating(true);

    const cloneContainer = document.createElement('div');
    Object.assign(cloneContainer.style, {
        position: 'fixed', top: '-9999px', left: '-9999px',
        transform: 'none', margin: '0', width: '1080px', height: '1080px', display: 'flex'
    });
    
    const clone = captureRef.current.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);

    try {
      const canvas = await html2canvas(clone, {
          width: 1080,
          height: 1080,
          scale: 1.5,
          useCORS: true, 
          backgroundColor: '#0f172a'
      });
      
      const imageData = canvas.toDataURL("image/png");
      setGeneratedImg(imageData);
      setShowModal(true);
    } catch (err) {
      console.error("Erro no html2canvas:", err);
      alert("Ocorreu um erro. Verifique se o link da imagem é válido e permite cópia (CORS).");
    } finally {
      document.body.removeChild(cloneContainer);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#020617] font-sans text-white">
      <style>{`
        .post-capture-base { width: 1080px; height: 1080px; background-color: #0f172a; position: relative; overflow: hidden; box-sizing: border-box; }
        .grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(6, 182, 212, 0.08) 2px, transparent 2px), linear-gradient(to bottom, rgba(6, 182, 212, 0.08) 2px, transparent 2px); background-size: 60px 60px; z-index: 1; pointer-events: none; }
        .glow-orb-1 { position: absolute; width: 800px; height: 800px; background: radial-gradient(circle, rgba(30, 58, 138, 0.5) 0%, transparent 70%); top: -200px; left: -200px; z-index: 2; pointer-events: none; }
        .glow-orb-2 { position: absolute; width: 800px; height: 800px; background: radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 65%); bottom: -300px; right: -200px; z-index: 2; pointer-events: none; }
        .bg-human-container { position: absolute; inset: 0; width: 100%; height: 100%; background-size: cover; background-position: center 20%; z-index: 3; filter: grayscale(20%) contrast(110%); }
        .fade-bottom-up { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a 15%, rgba(15, 23, 42, 0.9) 45%, rgba(6, 182, 212, 0.2) 100%); z-index: 4; mix-blend-mode: multiply; }
        .fade-bottom-up-solid { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a 15%, rgba(15, 23, 42, 0.8) 45%, transparent 100%); z-index: 5; }
        .safe-text-render { line-height: 1.2 !important; padding-bottom: 8px !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      {/* PAINEL DE CONTROLE (Esquerda) */}
      <div className="w-full md:w-[420px] bg-slate-900 border-r border-slate-800 p-6 md:p-8 flex flex-col h-1/2 md:h-screen overflow-y-auto z-20 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 flex items-center justify-center"><Camera size={16} className="text-cyan-500"/></div>
          <h1 className="text-xl font-bold tracking-tight">Criador de <span className="text-cyan-500">Posts</span></h1>
        </div>

        <div className="space-y-6 flex-grow">
          {/* SELETOR DE TEMA */}
          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-900/50">
            <label className="block text-[11px] font-bold text-cyan-500 uppercase tracking-wider mb-3">Estilo Visual do Post</label>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setTheme('artigo')} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex justify-between items-center ${theme === 'artigo' ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold' : 'border-slate-700 bg-slate-900 text-slate-400 font-medium hover:border-slate-500'}`}>
                <span className="flex items-center"><ImageIcon size={16} className={`mr-2 ${theme === 'artigo' ? 'text-cyan-400' : 'text-slate-500'}`}/> Artigo / Humanizado</span>
                {theme === 'artigo' && <Check size={16} className="text-cyan-400" />}
              </button>
              <button onClick={() => setTheme('quote')} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex justify-between items-center ${theme === 'quote' ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold' : 'border-slate-700 bg-slate-900 text-slate-400 font-medium hover:border-slate-500'}`}>
                <span className="flex items-center"><Quote size={16} className={`mr-2 ${theme === 'quote' ? 'text-cyan-400' : 'text-slate-500'}`}/> Citação / Insight</span>
                {theme === 'quote' && <Check size={16} className="text-cyan-400" />}
              </button>
              <button onClick={() => setTheme('comunicado')} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex justify-between items-center ${theme === 'comunicado' ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold' : 'border-slate-700 bg-slate-900 text-slate-400 font-medium hover:border-slate-500'}`}>
                <span className="flex items-center"><BarChart2 size={16} className={`mr-2 ${theme === 'comunicado' ? 'text-cyan-400' : 'text-slate-500'}`}/> Comunicado / Dados</span>
                {theme === 'comunicado' && <Check size={16} className="text-cyan-400" />}
              </button>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* CAMPOS EDITÁVEIS */}
          {theme !== 'quote' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {theme === 'artigo' ? 'Selo / Categoria' : 'Etiqueta de Alerta'}
              </label>
              <input type="text" value={tag} onChange={e => setTag(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-400 focus:border-cyan-500 focus:outline-none text-sm transition-colors font-bold uppercase" />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Título Principal (Impacto)</label>
            <textarea rows={3} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none font-bold text-sm transition-colors resize-none"></textarea>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Subtítulo ou Autor</label>
            <input type="text" value={sub} onChange={e => setSub(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 focus:border-cyan-500 focus:outline-none text-sm transition-colors" />
          </div>

          {theme === 'artigo' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Imagem de Fundo (URL)</label>
              <input type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="Cole a URL da foto" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-400 focus:border-cyan-500 focus:outline-none text-xs transition-colors" />
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800">
          <button onClick={generateImage} disabled={isGenerating} className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-slate-900 font-bold py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex justify-center items-center gap-2 text-lg">
            {isGenerating ? <span className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full"></span> : <Camera size={20} />}
            {isGenerating ? 'Gerando...' : 'Guardar Post (PNG)'}
          </button>
        </div>
      </div>

      {/* ÁREA DE VISUALIZAÇÃO (Preview) */}
      <div ref={previewContainerRef} className="w-full md:flex-1 flex items-center justify-center bg-[#020617] relative overflow-hidden h-1/2 md:h-screen p-8">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.3 }}></div>
        
        <div ref={scaleContainerRef} className="relative z-10 transition-all duration-300 origin-top flex justify-center">
          <div ref={scaleWrapperRef} className="absolute top-0 left-0 origin-top-left rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-[#0f172a]">
            
            {/* A ARTE DO POST (1080x1080) */}
            <div ref={captureRef} className="post-capture-base">
              <div className="grid-overlay"></div>
              <div className="glow-orb-1"></div>
              <div className="glow-orb-2"></div>

              {/* TEMA 1: ARTIGO */}
              {theme === 'artigo' && (
                <div className="absolute inset-0 flex flex-col justify-between p-20 z-10">
                  <div className="bg-human-container" style={{ backgroundImage: `url('${image}')` }}></div>
                  <div className="fade-bottom-up"></div>
                  <div className="fade-bottom-up-solid"></div>
                  
                  <div className="relative z-20 flex justify-between items-start">
                    <div className="flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: '80px', height: '80px', color: '#06b6d4' }}>
                          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                          <ellipse cx="50" cy="50" rx="22" ry="34" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                          <path d="M 50,4 L 38,18 L 50,16 M 50,4 L 62,18 L 50,16 M 82,17 L 62,18 L 74,28 M 82,17 L 80,35 L 72,35 M 96,50 L 80,35 L 72,50 M 96,50 L 80,65 L 72,50 M 82,83 L 80,65 L 74,72 M 82,83 L 62,82 L 68,78 M 50,96 L 62,82 L 50,84 M 50,96 L 38,82 L 50,84 M 18,83 L 38,82 L 32,78 M 18,83 L 20,65 L 26,72 M 4,50 L 20,65 L 28,50 M 4,50 L 20,35 L 28,50 M 18,17 L 20,35 L 26,28 M 18,17 L 38,18 L 32,22 M 38,18 L 62,18 M 20,35 L 20,65 M 38,82 L 62,82 M 80,35 L 80,65" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="50" cy="4" r="3" fill="currentColor"/><circle cx="82" cy="17" r="3" fill="currentColor"/><circle cx="96" cy="50" r="3" fill="currentColor"/><circle cx="82" cy="83" r="3" fill="currentColor"/><circle cx="50" cy="96" r="3" fill="currentColor"/><circle cx="18" cy="83" r="3" fill="currentColor"/><circle cx="4" cy="50" r="3" fill="currentColor"/><circle cx="18" cy="17" r="3" fill="currentColor"/><circle cx="38" cy="18" r="3" fill="currentColor"/><circle cx="62" cy="18" r="3" fill="currentColor"/><circle cx="80" cy="35" r="3" fill="currentColor"/><circle cx="80" cy="65" r="3" fill="currentColor"/><circle cx="62" cy="82" r="3" fill="currentColor"/><circle cx="38" cy="82" r="3" fill="currentColor"/><circle cx="20" cy="65" r="3" fill="currentColor"/><circle cx="20" cy="35" r="3" fill="currentColor"/>
                      </svg>
                      <span className="text-white font-bold text-xl tracking-tighter mt-2">ORION<span className="text-cyan-500">.</span></span>
                    </div>
                    <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500 text-cyan-400 px-6 py-3 rounded-full font-bold text-[22px] tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      {tag}
                    </div>
                  </div>
                  <div className="relative z-20 mt-auto mb-4">
                    <h1 className="text-white font-extrabold text-[85px] safe-text-render tracking-tight mb-8 drop-shadow-2xl">{title}</h1>
                    <p className="text-[34px] font-light text-cyan-50 border-l-4 border-cyan-500 pl-6 drop-shadow-lg">{sub}</p>
                  </div>
                </div>
              )}

              {/* TEMA 2: CITAÇÃO */}
              {theme === 'quote' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center p-24 z-10 text-center">
                  <div className="relative z-20 text-[250px] font-serif text-cyan-500/20 leading-[0] h-10 mb-20" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                  <h1 className="relative z-20 text-[70px] font-medium leading-[1.3] safe-text-render tracking-tight mb-16 text-white drop-shadow-xl" style={{ fontFamily: 'Georgia, serif' }}>{title}</h1>
                  <div className="relative z-20 flex flex-col items-center gap-4">
                    <div className="w-20 h-[3px] bg-cyan-500 mb-2"></div>
                    <p className="text-[30px] font-bold text-cyan-400 uppercase tracking-widest">{sub}</p>
                  </div>
                  <div className="absolute bottom-16 right-16 flex items-center gap-4 opacity-70">
                    <span className="font-bold text-white text-[24px] tracking-wider">ORION<span className="text-cyan-500">.</span></span>
                  </div>
                </div>
              )}

              {/* TEMA 3: COMUNICADO */}
              {theme === 'comunicado' && (
                <div className="absolute inset-0 flex flex-col justify-between p-24 z-10">
                  <div className="relative z-20 flex justify-between items-center border-b-2 border-slate-800 pb-8">
                    <div className="flex items-center gap-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: '60px', height: '60px', color: '#06b6d4' }}>
                        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                        <ellipse cx="50" cy="50" rx="22" ry="34" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                        <path d="M 50,4 L 38,18 L 50,16 M 50,4 L 62,18 L 50,16 M 82,17 L 62,18 L 74,28 M 82,17 L 80,35 L 72,35 M 96,50 L 80,35 L 72,50 M 96,50 L 80,65 L 72,50 M 82,83 L 80,65 L 74,72 M 82,83 L 62,82 L 68,78 M 50,96 L 62,82 L 50,84 M 50,96 L 38,82 L 50,84 M 18,83 L 38,82 L 32,78 M 18,83 L 20,65 L 26,72 M 4,50 L 20,65 L 28,50 M 4,50 L 20,35 L 28,50 M 18,17 L 20,35 L 26,28 M 18,17 L 38,18 L 32,22 M 38,18 L 62,18 M 20,35 L 20,65 M 38,82 L 62,82 M 80,35 L 80,65" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="50" cy="4" r="3" fill="currentColor"/><circle cx="82" cy="17" r="3" fill="currentColor"/><circle cx="96" cy="50" r="3" fill="currentColor"/><circle cx="82" cy="83" r="3" fill="currentColor"/><circle cx="50" cy="96" r="3" fill="currentColor"/><circle cx="18" cy="83" r="3" fill="currentColor"/><circle cx="4" cy="50" r="3" fill="currentColor"/><circle cx="18" cy="17" r="3" fill="currentColor"/><circle cx="38" cy="18" r="3" fill="currentColor"/><circle cx="62" cy="18" r="3" fill="currentColor"/><circle cx="80" cy="35" r="3" fill="currentColor"/><circle cx="80" cy="65" r="3" fill="currentColor"/><circle cx="62" cy="82" r="3" fill="currentColor"/><circle cx="38" cy="82" r="3" fill="currentColor"/><circle cx="20" cy="65" r="3" fill="currentColor"/><circle cx="20" cy="35" r="3" fill="currentColor"/>
                      </svg>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-white text-[32px] tracking-tighter leading-none">ORION<span className="text-cyan-500">.</span></span>
                        <span className="text-cyan-500 font-bold text-[14px] tracking-[0.2em] mt-1">RECRUITMENT</span>
                      </div>
                    </div>
                    <div className="text-slate-400 text-2xl font-light">orionrecruitment.com.br</div>
                  </div>
                  <div className="relative z-20 bg-slate-900/60 border border-slate-700 p-16 rounded-3xl backdrop-blur-md shadow-2xl border-l-8 border-l-cyan-500 mt-10">
                    <div className="text-cyan-400 font-bold text-[26px] tracking-widest uppercase mb-8 flex items-center gap-4">
                      <span className="w-6 h-6 rounded-full border-2 border-cyan-400 flex items-center justify-center text-sm">!</span> <span>{tag}</span>
                    </div>
                    <h1 className="text-[75px] font-extrabold leading-[1.1] safe-text-render tracking-tight mb-8 text-white">{title}</h1>
                    <p className="text-[36px] text-slate-300 font-light leading-relaxed">{sub}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE DOWNLOAD */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 rounded-2xl p-6 text-center border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">A arte do post está pronta! 🚀</h2>
            
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 mx-auto w-full max-w-[400px] mb-6 mt-4">
              {generatedImg && <img src={generatedImg} alt="Imagem Gerada" className="w-full h-auto shadow-lg" />}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 rounded-lg transition-colors">
                Fechar
              </button>
              <a href={generatedImg!} download={`Orion_Post_${theme}.png`} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
                <Download size={20} /> Transferir Imagem
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
