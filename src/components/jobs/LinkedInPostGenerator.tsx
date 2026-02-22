import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Briefcase, MapPin, Download, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JobRow } from '@/hooks/useJobs';
import { jobAreaLabels, JobArea } from '@/types/ats';

interface LinkedInPostGeneratorProps {
  job: JobRow;
}

const OrionLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: 100, height: 100, color: '#06b6d4' }}>
    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    <ellipse cx="50" cy="50" rx="22" ry="34" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M 50,4 L 38,18 L 50,16 M 50,4 L 62,18 L 50,16 M 82,17 L 62,18 L 74,28 M 82,17 L 80,35 L 72,35 M 96,50 L 80,35 L 72,50 M 96,50 L 80,65 L 72,50 M 82,83 L 80,65 L 74,72 M 82,83 L 62,82 L 68,78 M 50,96 L 62,82 L 50,84 M 50,96 L 38,82 L 50,84 M 18,83 L 38,82 L 32,78 M 18,83 L 20,65 L 26,72 M 4,50 L 20,65 L 28,50 M 4,50 L 20,35 L 28,50 M 18,17 L 20,35 L 26,28 M 18,17 L 38,18 L 32,22 M 38,18 L 62,18 M 20,35 L 20,65 M 38,82 L 62,82 M 80,35 L 80,65" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="50" cy="4" r="3" fill="currentColor"/><circle cx="82" cy="17" r="3" fill="currentColor"/><circle cx="96" cy="50" r="3" fill="currentColor"/><circle cx="82" cy="83" r="3" fill="currentColor"/><circle cx="50" cy="96" r="3" fill="currentColor"/><circle cx="18" cy="83" r="3" fill="currentColor"/><circle cx="4" cy="50" r="3" fill="currentColor"/><circle cx="18" cy="17" r="3" fill="currentColor"/><circle cx="38" cy="18" r="3" fill="currentColor"/><circle cx="62" cy="18" r="3" fill="currentColor"/><circle cx="80" cy="35" r="3" fill="currentColor"/><circle cx="80" cy="65" r="3" fill="currentColor"/><circle cx="62" cy="82" r="3" fill="currentColor"/><circle cx="38" cy="82" r="3" fill="currentColor"/><circle cx="20" cy="65" r="3" fill="currentColor"/><circle cx="20" cy="35" r="3" fill="currentColor"/>
  </svg>
);

// The 1080x1080 art element
function PostArt({ area, title, model, location, badge }: {
  area: string; title: string; model: string; location: string; badge: string;
}) {
  const captureStyle: React.CSSProperties = {
    width: 1080, height: 1080, backgroundColor: '#0f172a',
    position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
    padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    fontFamily: "'Inter', sans-serif",
  };

  const gridStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(to right, rgba(6,182,212,0.08) 2px, transparent 2px), linear-gradient(to bottom, rgba(6,182,212,0.08) 2px, transparent 2px)',
    backgroundSize: '60px 60px', zIndex: 0, pointerEvents: 'none',
  };

  const glowOrb1: React.CSSProperties = {
    position: 'absolute', width: 800, height: 800,
    background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
    top: -300, right: -300, zIndex: 0,
  };

  const glowOrb2: React.CSSProperties = {
    position: 'absolute', width: 800, height: 800,
    background: 'radial-gradient(circle, rgba(30,58,138,0.3) 0%, transparent 70%)',
    bottom: -300, left: -300, zIndex: 0,
  };

  return (
    <div style={captureStyle}>
      <div style={gridStyle} />
      <div style={glowOrb1} />
      <div style={glowOrb2} />

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            backgroundColor: '#06b6d4', color: '#0f172a', padding: '12px 24px',
            borderRadius: 9999, fontWeight: 700, fontSize: 24,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            boxShadow: '0 0 30px rgba(6,182,212,0.4)',
          }}>
            {badge}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <OrionLogo />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 24, letterSpacing: '-0.05em', marginTop: 8 }}>
              ORION<span style={{ color: '#06b6d4' }}>.</span>
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ marginTop: 80, marginBottom: 40 }}>
          <h3 style={{
            color: '#06b6d4', fontWeight: 700, fontSize: 36, marginBottom: 24,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            borderLeft: '4px solid #06b6d4', paddingLeft: 16,
          }}>
            {area}
          </h3>
          <h1 style={{
            color: 'white', fontWeight: 800, fontSize: 100, lineHeight: 1.05,
            letterSpacing: '-0.025em', width: 900,
          }}>
            {title}
          </h1>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: '2px solid #1e293b', paddingTop: 40,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: '#cbd5e1' }}>
              <Briefcase style={{ width: 36, height: 36, color: '#06b6d4' }} />
              <span style={{ fontSize: 36, fontWeight: 300 }}>{model}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: '#cbd5e1' }}>
              <MapPin style={{ width: 36, height: 36, color: '#06b6d4' }} />
              <span style={{ fontSize: 36, fontWeight: 300 }}>{location}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#94a3b8', fontSize: 30, marginBottom: 8 }}>Envie o seu currículo ou candidate-se em:</p>
            <p style={{ color: '#22d3ee', fontWeight: 700, fontSize: 36, letterSpacing: '0.05em' }}>orionrecruitment.com.br</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInPostGenerator({ job }: LinkedInPostGeneratorProps) {
  const areaLabel = (job as any).area ? jobAreaLabels[(job as any).area as JobArea] || '' : '';

  const [area, setArea] = useState(areaLabel);
  const [title, setTitle] = useState(job.title);
  const [model, setModel] = useState('');
  const [location, setLocation] = useState(job.location || '');
  const [badge, setBadge] = useState('VAGA EM DESTAQUE');
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setDownloading(true);

    try {
      // Clone off-screen for exact 1080x1080 capture
      const clone = captureRef.current.cloneNode(true) as HTMLElement;
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '1080px';
      container.style.height = '1080px';
      container.appendChild(clone);
      document.body.appendChild(container);

      const dataUrl = await toPng(clone, {
        width: 1080,
        height: 1080,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
      });

      document.body.removeChild(container);

      const link = document.createElement('a');
      const cargoName = title.split(' ')[0].toLowerCase() || 'vaga';
      link.download = `orion-post-${cargoName}.png`;
      link.href = dataUrl;
      link.click();

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-h-[80vh]">
      {/* Control Panel */}
      <div className="w-full lg:w-1/3 space-y-4 overflow-y-auto pr-2">
        <p className="text-sm text-muted-foreground">
          Preencha os dados para gerar a imagem da vaga (1080×1080, ideal para LinkedIn e Instagram).
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Área de Atuação</Label>
            <Input value={area} onChange={e => setArea(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Cargo / Vaga</Label>
            <Textarea value={title} onChange={e => setTitle(e.target.value)} rows={2} className="mt-1 font-bold text-lg resize-none" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Modelo de Trabalho</Label>
            <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: 100% Remoto / CLT" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Localização Base</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Destaque Superior</Label>
            <Input value={badge} onChange={e => setBadge(e.target.value)} className="mt-1" />
          </div>
        </div>

        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full mt-4"
          variant={downloaded ? 'default' : 'default'}
        >
          {downloading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> A gerar Imagem...</>
          ) : downloaded ? (
            <><Check className="h-4 w-4" /> Transferência Concluída!</>
          ) : (
            <><Download className="h-4 w-4" /> Transferir Imagem (PNG)</>
          )}
        </Button>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex items-center justify-center rounded-lg overflow-hidden" style={{
        backgroundColor: '#020617',
        backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        minHeight: 400,
      }}>
        <div style={{ width: 540, height: 540, position: 'relative' }}>
          <div ref={captureRef} style={{
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0, left: 0,
            boxShadow: '0 50px 100px -24px rgba(0,0,0,0.7)',
            borderRadius: 40,
            overflow: 'hidden',
          }}>
            <PostArt area={area} title={title} model={model} location={location} badge={badge} />
          </div>
        </div>
      </div>
    </div>
  );
}
