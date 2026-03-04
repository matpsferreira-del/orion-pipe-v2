import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Download, Pencil, Eye, Plus, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CVData, CVExperience, CVFormacao } from '@/types/cv';

// ── Mammoth loader ──
declare global {
  interface Window { mammoth?: any; }
}

function loadMammoth(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.mammoth) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar mammoth.js'));
    document.head.appendChild(script);
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Deep helpers ──
function getDeep(obj: any, keys: string[]): any {
  return keys.reduce((o, k) => (o != null ? o[k] : undefined), obj);
}
function setDeep(obj: any, keys: string[], value: any): any {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (Array.isArray(cur[keys[i]])) cur[keys[i]] = [...cur[keys[i]]];
    else cur[keys[i]] = { ...cur[keys[i]] };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return obj;
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function FormatacaoCV() {
  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File | undefined) => {
    if (!file) return;
    const isPDF = file.type === 'application/pdf' || file.name?.endsWith('.pdf');
    const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name?.endsWith('.docx');
    if (!isPDF && !isDOCX) {
      setError('Por favor, envie um arquivo PDF ou Word (.docx).');
      return;
    }
    setError('');
    setStep('processing');
    try {
      let body: { fileBase64?: string; fileText?: string; fileType: string };
      if (isPDF) {
        const base64 = await readAsBase64(file);
        body = { fileBase64: base64, fileType: 'pdf' };
      } else {
        await loadMammoth();
        const mammoth = window.mammoth;
        if (!mammoth) throw new Error('Não foi possível carregar o leitor de arquivos Word.');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value || '';
        if (text.trim().length < 50) throw new Error('Não foi possível extrair texto suficiente do arquivo Word.');
        body = { fileText: text, fileType: 'docx' };
      }

      const { data, error: fnError } = await supabase.functions.invoke('extract-cv', { body });

      if (fnError) throw new Error(fnError.message || 'Erro ao processar CV');
      if (data?.error) throw new Error(data.error);
      if (!data?.cvData) throw new Error('Resposta inválida do servidor');

      setCvData(data.cvData);
      setStep('preview');
    } catch (err: any) {
      setError(`Erro ao processar: ${err.message || 'tente novamente.'}`);
      setStep('upload');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── PROCESSING ──
  if (step === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card rounded-2xl p-12 text-center shadow-lg max-w-md w-full border border-border">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <p className="text-lg font-semibold text-foreground mb-2">Lendo e extraindo dados do CV...</p>
          <p className="text-sm text-muted-foreground">A IA está identificando o formato e estruturando as informações</p>
          <Progress value={60} className="mt-6" />
        </div>
      </div>
    );
  }

  // ── EDITOR ──
  if (step === 'preview' && cvData) {
    return (
      <EditorScreen
        data={cvData}
        onReset={() => { setCvData(null); setStep('upload'); }}
      />
    );
  }

  // ── UPLOAD ──
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-10">
      <div className="text-center mb-10">
        <span className="inline-block bg-[#0F172A] text-primary px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest mb-4">
          ✦ ORION
        </span>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">CV Transformer</h1>
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
          Importe qualquer CV e gere automaticamente o modelo padrão Orion
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/50'
        )}
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-base font-semibold text-foreground mb-1">Arraste o CV aqui</p>
        <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mb-4">Suporta PDF, LinkedIn PDF e Word (.docx)</p>
        <Button size="sm" className="rounded-full">
          <FileText className="h-4 w-4 mr-2" />
          Selecionar arquivo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => processFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="mt-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm max-w-lg w-full">
          {error}
        </div>
      )}

      <div className="mt-8 bg-card border border-border rounded-xl p-5 max-w-lg w-full">
        <h3 className="text-xs font-bold text-primary tracking-widest uppercase mb-3">Formatos suportados</h3>
        <p className="text-sm text-muted-foreground">📄 PDF — qualquer CV em PDF</p>
        <p className="text-sm text-muted-foreground">🔗 LinkedIn PDF — perfil exportado diretamente do LinkedIn</p>
        <p className="text-sm text-muted-foreground">📝 Word (.docx) — CV em formato Word</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// EDITOR SCREEN
// ═══════════════════════════════════════════════
function EditorScreen({ data, onReset }: { data: CVData; onReset: () => void }) {
  const [cv, setCv] = useState<CVData>(data);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const docRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: string) =>
    setHiddenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleExportPDF = useCallback(async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(docRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const ratio = img.width / img.height;
      const imgH = pageW / ratio;
      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, -yOffset, pageW, imgH);
        yOffset += pageH;
      }
      const nomeArquivo = (cv.nome || 'CV').replace(/\s+/g, '_');
      pdf.save(`CV_${nomeArquivo}_Orion.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast({ title: 'Erro ao gerar PDF', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [cv.nome]);

  const setField = (path: string, value: string) => {
    setCv((prev) => setDeep({ ...prev }, path.split('.'), value));
  };

  const addToArray = (path: string) => {
    const keys = path.split('.');
    setCv((prev) => {
      const next = { ...prev };
      const arr = getDeep(next, keys);
      setDeep(next, keys, [...(arr || []), '']);
      return next;
    });
  };

  const removeFromArray = (path: string, idx: number) => {
    const keys = path.split('.');
    setCv((prev) => {
      const next = { ...prev };
      const arr = [...(getDeep(next, keys) || [])];
      arr.splice(idx, 1);
      setDeep(next, keys, arr);
      return next;
    });
  };

  const setArrayItem = (path: string, idx: number, val: string) => {
    const keys = path.split('.');
    setCv((prev) => {
      const next = { ...prev };
      const arr = [...(getDeep(next, keys) || [])];
      arr[idx] = val;
      setDeep(next, keys, arr);
      return next;
    });
  };

  const addExp = () =>
    setCv((prev) => ({
      ...prev,
      experiencias: [
        ...(prev.experiencias || []),
        { empresa: '', cargo: '', periodo: '', localizacao: '', descricao: '', responsabilidades: [], resultados: [] },
      ],
    }));

  const removeExp = (i: number) =>
    setCv((prev) => {
      const arr = [...prev.experiencias];
      arr.splice(i, 1);
      return { ...prev, experiencias: arr };
    });

  const addFormacao = () =>
    setCv((prev) => ({
      ...prev,
      formacao: [...(prev.formacao || []), { nivel: '', curso: '', instituicao: '', periodo: '' }],
    }));

  const removeFormacao = (i: number) =>
    setCv((prev) => {
      const arr = [...prev.formacao];
      arr.splice(i, 1);
      return { ...prev, formacao: arr };
    });

  return (
    <div className="min-h-full">
      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="outline" size="sm" onClick={onReset}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Novo CV
        </Button>
        <span className="flex-1 font-bold text-foreground text-sm truncate">{cv.nome}</span>
        <div className="flex items-center gap-2">
          <Button
            variant={editing ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? <><Eye className="h-4 w-4 mr-1" /> Visualizar</> : <><Pencil className="h-4 w-4 mr-1" /> Editar</>}
          </Button>
          <Button size="sm" onClick={handleExportPDF} disabled={exporting} className="bg-[#0F172A] text-primary hover:bg-[#1e293b]">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            {exporting ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="bg-primary/5 border-b border-primary/20 px-4 py-2.5 text-sm text-primary text-center">
          ✏️ Modo edição ativo — clique em qualquer campo para editar. Use "Visualizar" para ver o resultado limpo.
        </div>
      )}

      {/* DOCUMENT */}
      <div className="max-w-[860px] mx-auto my-8 bg-white shadow-xl rounded overflow-hidden">
        <div ref={docRef}>
          <CVDocument
            cv={cv}
            editing={editing}
            setField={setField}
            addToArray={addToArray}
            removeFromArray={removeFromArray}
            setArrayItem={setArrayItem}
            addExp={addExp}
            removeExp={removeExp}
            addFormacao={addFormacao}
            removeFormacao={removeFormacao}
            hiddenSections={hiddenSections}
            toggleSection={toggleSection}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// CV DOCUMENT
// ═══════════════════════════════════════════════
interface CVDocProps {
  cv: CVData;
  editing: boolean;
  setField: (path: string, value: string) => void;
  addToArray: (path: string) => void;
  removeFromArray: (path: string, idx: number) => void;
  setArrayItem: (path: string, idx: number, val: string) => void;
  addExp: () => void;
  removeExp: (i: number) => void;
  addFormacao: () => void;
  removeFormacao: (i: number) => void;
  hiddenSections: string[];
  toggleSection: (key: string) => void;
}

function CVDocument({
  cv, editing, setField, addToArray, removeFromArray, setArrayItem,
  addExp, removeExp, addFormacao, removeFormacao, hiddenSections, toggleSection,
}: CVDocProps) {
  return (
    <div style={{ fontFamily: "'Segoe UI','Calibri',Arial,sans-serif", color: '#0F172A' }}>
      {/* HEADER */}
      <div className="bg-[#0F172A] px-12 py-9 flex justify-between items-start gap-8">
        <div>
          <EditableField editing={editing} value={cv.nome} onChange={(v) => setField('nome', v)}
            className="text-[28px] font-extrabold text-white block" placeholder="Nome Completo" />
          <EditableField editing={editing} value={cv.cargo_titulo} onChange={(v) => setField('cargo_titulo', v)}
            className="mt-1.5 text-sm text-slate-400 block max-w-md" placeholder="Cargo / Especialidade" />
        </div>
        <div className="flex flex-col gap-1.5 text-right flex-shrink-0 mt-1">
          <ContactLine icon="📍" editing={editing} value={cv.localizacao} onChange={(v) => setField('localizacao', v)} placeholder="Cidade - UF" />
          <ContactLine icon="📞" editing={editing} value={cv.telefone} onChange={(v) => setField('telefone', v)} placeholder="Telefone" />
          <ContactLine icon="✉️" editing={editing} value={cv.email} onChange={(v) => setField('email', v)} placeholder="E-mail" />
          <ContactLine icon="🔗" editing={editing} value={cv.linkedin} onChange={(v) => setField('linkedin', v)} placeholder="URL LinkedIn" isLink />
        </div>
      </div>

      {/* BODY */}
      <div className="px-12 py-9">
        {/* Resumo */}
        <Section title="RESUMO PROFISSIONAL" editing={editing} hidden={hiddenSections.includes('resumo')} onToggle={() => toggleSection('resumo')}>
          <EditableField editing={editing} value={cv.resumo} onChange={(v) => setField('resumo', v)}
            className="text-[13px] text-slate-600 leading-relaxed block" placeholder="Resumo profissional..." multiline />
        </Section>

        {/* Experiências */}
        <Section title="EXPERIÊNCIA PROFISSIONAL" editing={editing} hidden={hiddenSections.includes('experiencias')} onToggle={() => toggleSection('experiencias')}>
          {(cv.experiencias || []).map((exp, i) => (
            <div key={i} className="pb-5 border-b border-slate-100 mb-5 last:border-0">
              <div className="flex justify-between items-start mb-1.5 gap-4">
                <div>
                  <EditableField editing={editing} value={exp.empresa} onChange={(v) => setField(`experiencias.${i}.empresa`, v)}
                    className="font-bold text-primary text-[13px] inline" placeholder="Empresa" inline />
                  {exp.empresa && exp.cargo && <span className="text-slate-400 mx-1">·</span>}
                  <EditableField editing={editing} value={exp.cargo} onChange={(v) => setField(`experiencias.${i}.cargo`, v)}
                    className="font-semibold text-[#0F172A] text-[13px] inline" placeholder="Cargo" inline />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <EditableField editing={editing} value={exp.periodo} onChange={(v) => setField(`experiencias.${i}.periodo`, v)}
                    className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200 inline-block" placeholder="Período" inline />
                  <EditableField editing={editing} value={exp.localizacao} onChange={(v) => setField(`experiencias.${i}.localizacao`, v)}
                    className="text-[10px] text-slate-400 italic inline-block" placeholder="Localização" inline />
                  {editing && (
                    <button onClick={() => removeExp(i)} className="text-red-400 text-[10px] hover:text-red-600">✕ remover</button>
                  )}
                </div>
              </div>

              <EditableField editing={editing} value={exp.descricao} onChange={(v) => setField(`experiencias.${i}.descricao`, v)}
                className="text-[12px] text-slate-600 my-1 leading-relaxed block" placeholder="Descrição / contexto..." multiline />

              <BulletList editing={editing} items={exp.responsabilidades || []} dot="▸" dotColor="text-primary"
                onAdd={() => addToArray(`experiencias.${i}.responsabilidades`)}
                onRemove={(j) => removeFromArray(`experiencias.${i}.responsabilidades`, j)}
                onChange={(j, v) => setArrayItem(`experiencias.${i}.responsabilidades`, j, v)}
                placeholder="Responsabilidade..." addLabel="+ responsabilidade" />

              {((exp.resultados && exp.resultados.length > 0) || editing) && (
                <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 mt-2">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-1.5">Resultados</span>
                  <BulletList editing={editing} items={exp.resultados || []} dot="★" dotColor="text-primary"
                    onAdd={() => addToArray(`experiencias.${i}.resultados`)}
                    onRemove={(j) => removeFromArray(`experiencias.${i}.resultados`, j)}
                    onChange={(j, v) => setArrayItem(`experiencias.${i}.resultados`, j, v)}
                    placeholder="Resultado..." addLabel="+ resultado" />
                </div>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={addExp} className="w-full text-center border border-dashed border-primary text-primary rounded-lg py-2 text-[12px] hover:bg-primary/5 transition">
              + adicionar experiência
            </button>
          )}
        </Section>

        {/* Formação + Idiomas */}
        <div className="flex gap-10">
          <div className="flex-1">
            <Section title="FORMAÇÃO ACADÊMICA" editing={editing} hidden={hiddenSections.includes('formacao')} onToggle={() => toggleSection('formacao')}>
              {(cv.formacao || []).map((f, i) => (
                <div key={i} className="mb-3 relative">
                  {editing && (
                    <button onClick={() => removeFormacao(i)} className="absolute top-0 right-0 text-red-400 text-[10px] hover:text-red-600">✕ remover</button>
                  )}
                  <EditableField editing={editing} value={f.curso} onChange={(v) => setField(`formacao.${i}.curso`, v)}
                    className="font-bold text-[#0F172A] text-[13px] block" placeholder="Nível + Curso" />
                  <EditableField editing={editing} value={f.instituicao} onChange={(v) => setField(`formacao.${i}.instituicao`, v)}
                    className="text-primary text-[12px] font-semibold block mt-0.5" placeholder="Instituição" />
                  <EditableField editing={editing} value={f.periodo} onChange={(v) => setField(`formacao.${i}.periodo`, v)}
                    className="text-slate-400 text-[11px] block mt-0.5" placeholder="Período" />
                </div>
              ))}
              {editing && (
                <button onClick={addFormacao} className="w-full text-center border border-dashed border-primary text-primary rounded-lg py-1.5 text-[11px] hover:bg-primary/5 transition">
                  + adicionar formação
                </button>
              )}
            </Section>
          </div>

          <div className="w-48 flex-shrink-0">
            <Section title="IDIOMAS" editing={editing} hidden={hiddenSections.includes('idiomas')} onToggle={() => toggleSection('idiomas')}>
              <BulletList editing={editing} items={cv.idiomas || []} dot="" dotColor=""
                onAdd={() => addToArray('idiomas')}
                onRemove={(j) => removeFromArray('idiomas', j)}
                onChange={(j, v) => setArrayItem('idiomas', j, v)}
                placeholder="Idioma..." addLabel="+ idioma" chipStyle />
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-300">
          <span>✦ ORION</span>
          <span>Gerado automaticamente · CV Transformer</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════

function EditableField({
  editing, value, onChange, className, placeholder, multiline, inline,
}: {
  editing: boolean; value: string; onChange: (v: string) => void;
  className?: string; placeholder?: string; multiline?: boolean; inline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  if (!editing) {
    if (!value) return null;
    const Tag = inline ? 'span' : 'div';
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={cn(className, 'outline-none border-b border-dashed border-primary/40 bg-primary/[0.02] rounded-sm px-1 cursor-text', inline ? 'inline-block' : 'block')}
      style={{ whiteSpace: multiline ? 'pre-wrap' : 'pre', minWidth: 40 }}
      data-placeholder={placeholder}
      onBlur={() => onChange(ref.current?.innerText?.trim() || '')}
      onKeyDown={(e) => { if (!multiline && e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  );
}

function ContactLine({ icon, editing, value, onChange, placeholder, isLink }: {
  icon: string; editing: boolean; value: string; onChange: (v: string) => void; placeholder: string; isLink?: boolean;
}) {
  if (!editing && !value) return null;
  return (
    <div className="flex items-center gap-2 justify-end text-[12px]">
      <span>{icon}</span>
      {editing ? (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent border-b border-dashed border-slate-600 text-slate-300 text-[12px] outline-none w-44 text-right font-[inherit]"
        />
      ) : isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline">LinkedIn</a>
      ) : (
        <span className="text-slate-300">{value}</span>
      )}
    </div>
  );
}

function BulletList({ editing, items, dot, dotColor, onAdd, onRemove, onChange, placeholder, addLabel, chipStyle }: {
  editing: boolean; items: string[]; dot: string; dotColor: string;
  onAdd: () => void; onRemove: (j: number) => void; onChange: (j: number, v: string) => void;
  placeholder?: string; addLabel?: string; chipStyle?: boolean;
}) {
  return (
    <div>
      {items.map((item, j) => (
        <div key={j} className="flex items-start gap-1.5 mb-1">
          {dot && <span className={cn('text-[12px] mt-0.5 flex-shrink-0', dotColor)}>{dot}</span>}
          {editing ? (
            <>
              <textarea
                value={item}
                onChange={(e) => onChange(j, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="flex-1 text-[12px] text-slate-600 border-b border-dashed border-primary/40 outline-none resize-y font-[inherit] leading-relaxed bg-primary/[0.02] rounded-sm px-1"
              />
              <button onClick={() => onRemove(j)} className="text-red-400 text-[12px] hover:text-red-600 flex-shrink-0">✕</button>
            </>
          ) : chipStyle ? (
            <span className="bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 text-[11px]">{item}</span>
          ) : (
            <span className="text-[12px] text-slate-600 leading-relaxed">{item}</span>
          )}
        </div>
      ))}
      {editing && (
        <button onClick={onAdd} className="border border-dashed border-primary text-primary rounded-md px-2.5 py-0.5 text-[11px] mt-1 hover:bg-primary/5 transition">
          {addLabel || '+ adicionar'}
        </button>
      )}
    </div>
  );
}

function Section({ title, children, editing, hidden, onToggle }: {
  title: string; children: React.ReactNode; editing?: boolean; hidden?: boolean; onToggle?: () => void;
}) {
  return (
    <div className={cn('mb-7', hidden && 'opacity-40')}>
      <div className="flex items-center gap-3 mb-3.5">
        <span className="text-[11px] font-extrabold tracking-[0.12em] text-primary uppercase whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-slate-200" />
        {editing && onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap flex-shrink-0',
              hidden ? 'bg-red-50 border-red-200 text-red-500' : 'bg-primary/5 border-primary/20 text-primary'
            )}
          >
            {hidden ? '👁 Mostrar' : '🗑 Remover'}
          </button>
        )}
      </div>
      {!hidden && children}
    </div>
  );
}
