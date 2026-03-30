// ─────────────────────────────────────────────────────────────
// FormatacaoCV — Página /formatacao-cv
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, PageBreak, ShadingType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

const EXTRACT_PROMPT = `Você é um especialista em leitura e extração de dados de currículos para a empresa Orion.
Você receberá um CV em qualquer formato — LinkedIn PDF, Word convertido, CV tradicional, currículo Lattes, ou qualquer outro layout — e deve extrair ABSOLUTAMENTE TODAS as informações presentes, retornando SOMENTE um JSON válido, sem markdown, sem blocos de código, sem qualquer texto antes ou depois.

Identifique automaticamente o formato do documento e adapte a extração. Independente do layout, mapeie as informações para a estrutura abaixo:

ESTRUTURA OBRIGATÓRIA:
{
  "nome": "string — nome completo do candidato",
  "cargo_titulo": "string — cargo atual, título profissional ou headline. Se não houver, inferir pela experiência mais recente",
  "email": "string — endereço de e-mail, se presente",
  "telefone": "string — telefone ou celular, se presente",
  "linkedin": "string — URL do LinkedIn, se presente",
  "localizacao": "string — cidade e estado/país",
  "resumo": "string — copie integralmente o texto de resumo, objetivo, perfil ou summary. Se não houver seção dedicada, deixe vazio",
  "experiencias": [
    {
      "empresa": "string — nome exato da empresa ou organização",
      "cargo": "string — cargo ou função exata",
      "periodo": "string — período completo como aparece no CV, ex: jan/2022 - dez/2023 ou 2022 - Atual",
      "localizacao": "string — cidade/país da experiência, se presente",
      "descricao": "string — texto introdutório ou descritivo da função, copiado integralmente",
      "responsabilidades": ["string — cada responsabilidade, atividade ou atribuição listada, texto completo"],
      "resultados": ["string — cada resultado, conquista, entrega ou impacto quantificado, texto completo"]
    }
  ],
  "formacao": [
    {
      "curso": "string — nome do curso ou área de estudo",
      "instituicao": "string — nome da instituição de ensino",
      "nivel": "string — nível: MBA / Especialização / Pós-Graduação / Bacharelado / Licenciatura / Tecnólogo / Técnico etc.",
      "periodo": "string — período ou ano de conclusão"
    }
  ],
  "idiomas": ["string — idioma e nível, ex: Inglês avançado, Espanhol intermediário"]
}

REGRAS CRÍTICAS — SIGA TODAS:
1. NÃO omita NENHUMA experiência — extraia todas, inclusive estágios, freelas e trabalhos antigos
2. NÃO trunce nem resuma nenhum texto — copie os conteúdos integralmente
3. NÃO invente informações — campos ausentes ficam como "" ou []
4. Separe claramente: texto introdutório vai em "descricao", atividades/atribuições em "responsabilidades", conquistas/métricas em "resultados". Se não houver separação clara, coloque tudo em "responsabilidades"
5. Ordene experiências da mais recente para a mais antiga
6. Se o CV tiver seções com nomes diferentes (ex: "Atuação Profissional", "Histórico", "Trajetória"), trate-as como experiências
7. Retorne APENAS o JSON puro, sem nenhum caractere fora do objeto JSON`;

// CSS global
const GLOBAL_CSS = `
  @keyframes orion-spin { to { transform: rotate(360deg); } }
  [contenteditable]:empty:before {
    content: attr(data-placeholder);
    color: #94A3B8;
    font-style: italic;
    pointer-events: none;
  }
  @media print {
    .orion-no-print, .orion-no-print * { display: none !important; }
    body { margin: 0; background: white; }
  }
`;

// ═══════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════
export default function FormatacaoCV() {
  useState(() => {
    const id = "orion-cv-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  });

  const [step, setStep] = useState("upload");
  const [cvData, setCvData] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const readAsBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const processFile = async (file) => {
    const isPDF = file?.type === "application/pdf" || file?.name?.endsWith(".pdf");
    const isDOCX =
      file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file?.name?.endsWith(".docx");
    if (!file || (!isPDF && !isDOCX)) {
      setError("Por favor, envie um arquivo PDF ou Word (.docx).");
      return;
    }
    setError("");
    setStep("processing");
    try {
      let messages;
      if (isPDF) {
        const base64 = await readAsBase64(file);
        messages = [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: "Extraia todas as informações deste CV e retorne o JSON estruturado." },
            ],
          },
        ];
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value || "";
        if (text.trim().length < 50) throw new Error("Não foi possível extrair texto do arquivo Word.");
        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia todas as informações deste CV e retorne o JSON estruturado.\n\n---\n" + text,
              },
            ],
          },
        ];
      }

      // Call edge function proxy to Anthropic
      const { data, error: fnError } = await supabase.functions.invoke("extract-cv", {
        body: {
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          system: EXTRACT_PROMPT,
          messages,
        },
      });

      if (fnError) throw new Error(fnError.message || "Erro na edge function");
      if (data?.error) throw new Error(data.error.message || JSON.stringify(data.error));

      const rawText = data.content?.map((b) => b.text || "").join("") || "";
      const clean = rawText.replace(/```json|```/g, "").trim();
      setCvData(JSON.parse(clean));
      setStep("preview");
    } catch (err) {
      setError(`Erro ao processar: ${err.message || "tente novamente."}`);
      setStep("upload");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── PROCESSANDO ──
  if (step === "processing")
    return (
      <div style={S.fullCenter}>
        <div style={S.loadingCard}>
          <div style={S.spinner} />
          <p style={{ color: "#0F172A", fontWeight: 700, fontSize: 18, marginTop: 24, marginBottom: 4 }}>
            Lendo e extraindo dados do CV...
          </p>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            A IA está identificando o formato e estruturando as informações
          </p>
        </div>
      </div>
    );

  // ── EDITOR ──
  if (step === "preview" && cvData)
    return (
      <EditorScreen
        data={cvData}
        onReset={() => {
          setCvData(null);
          setStep("upload");
        }}
      />
    );

  // ── UPLOAD ──
  return (
    <div style={S.uploadPage}>
      <div style={S.uploadHeader}>
        <div style={S.orionBadge}>✦ ORION</div>
        <h1 style={S.uploadTitle}>CV Transformer</h1>
        <p style={S.uploadSubtitle}>Importe qualquer CV e gere automaticamente o modelo padrão Orion</p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          ...S.dropZone,
          borderColor: dragOver ? "#06B6D4" : "#CBD5E1",
          background: dragOver ? "#F0FDFE" : "#FAFAFA",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>Arraste o CV aqui</p>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 6px" }}>ou clique para selecionar</p>
        <p style={{ fontSize: 11, color: "#CBD5E1", margin: "0 0 20px" }}>Suporta PDF, LinkedIn PDF e Word (.docx)</p>
        <div style={S.dropBtn}>Selecionar arquivo</div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={(e) => processFile(e.target.files[0])}
        />
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.howTo}>
        <p style={S.howToTitle}>Formatos suportados</p>
        <p style={S.howToStep}>📄 <strong>PDF</strong> — qualquer CV em PDF</p>
        <p style={S.howToStep}>🔗 <strong>LinkedIn PDF</strong> — perfil exportado diretamente do LinkedIn</p>
        <p style={S.howToStep}>📝 <strong>Word (.docx)</strong> — CV em formato Word</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// EDITOR SCREEN
// ═══════════════════════════════════════════════
function EditorScreen({ data, onReset }) {
  const [cv, setCv] = useState(data);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hiddenSections, setHiddenSections] = useState([]);

  const toggleSection = (key) =>
    setHiddenSections((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const docRef = useRef(null);

  const handleExportPDF = useCallback(async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      // Capture each section individually to avoid text cutting at page breaks
      const sections = docRef.current.querySelectorAll("[data-pdf-section]");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginTop = 4;
      const marginBottom = 4;
      const usableH = pageH - marginTop - marginBottom;
      let cursorY = marginTop;
      let isFirstSection = true;

      if (sections.length === 0) {
        // Fallback: capture entire document
        const dataUrl = await toPng(docRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
        const img = new Image();
        img.src = dataUrl;
        await new Promise((r) => { img.onload = r; });
        const ratio = img.width / img.height;
        const imgH = pageW / ratio;
        let yOff = 0;
        while (yOff < imgH) {
          if (yOff > 0) pdf.addPage();
          pdf.addImage(dataUrl, "PNG", 0, -yOff, pageW, imgH);
          yOff += pageH;
        }
      } else {
        for (const section of sections) {
          const dataUrl = await toPng(section, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
          const img = new Image();
          img.src = dataUrl;
          await new Promise((r) => { img.onload = r; });
          const ratio = img.width / img.height;
          const imgH = pageW / ratio;

          // If this section doesn't fit on current page, start new page
          if (!isFirstSection && cursorY + imgH > pageH - marginBottom) {
            pdf.addPage();
            cursorY = marginTop;
          }
          pdf.addImage(dataUrl, "PNG", 0, cursorY, pageW, imgH);
          cursorY += imgH;
          isFirstSection = false;
        }
      }

      const nomeArquivo = (cv.nome || "CV").replace(/\s+/g, "_");
      pdf.save(`CV_${nomeArquivo}_Orion.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }, [cv.nome]);

  const handleExportWord = useCallback(async () => {
    setExporting(true);
    try {
      const children = [];
      const CYAN = "06B6D4";
      const DARK = "0F172A";
      const GRAY = "475569";
      const LIGHT_GRAY = "94A3B8";

      // Header block: Name + Title
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: cv.nome || "Nome", bold: true, size: 48, font: "Calibri", color: DARK })],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: cv.cargo_titulo || "", size: 22, font: "Calibri", color: LIGHT_GRAY })],
        })
      );

      // Contact info
      const contactParts = [cv.localizacao, cv.telefone, cv.email, cv.linkedin].filter(Boolean);
      if (contactParts.length > 0) {
        children.push(
          new Paragraph({
            spacing: { after: 200 },
            children: contactParts.flatMap((c, i) => {
              const runs = [new TextRun({ text: c, size: 20, font: "Calibri", color: GRAY })];
              if (i < contactParts.length - 1) runs.push(new TextRun({ text: "  |  ", size: 20, color: LIGHT_GRAY }));
              return runs;
            }),
          })
        );
      }

      // Separator
      const addSectionHeader = (title) => {
        children.push(
          new Paragraph({
            spacing: { before: 300, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" } },
            children: [new TextRun({ text: title, bold: true, size: 20, font: "Calibri", color: CYAN, allCaps: true })],
          })
        );
      };

      // Resumo
      if (cv.resumo && !hiddenSections.includes("resumo")) {
        addSectionHeader("RESUMO DAS QUALIFICAÇÕES");
        children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: cv.resumo, size: 21, font: "Calibri", color: GRAY })] }));
      }

      // Experiências
      if ((cv.experiencias || []).length > 0 && !hiddenSections.includes("experiencias")) {
        addSectionHeader("EXPERIÊNCIA PROFISSIONAL");
        cv.experiencias.forEach((exp) => {
          children.push(
            new Paragraph({
              spacing: { before: 180, after: 40 },
              children: [
                new TextRun({ text: exp.empresa || "", bold: true, size: 22, font: "Calibri", color: CYAN }),
                new TextRun({ text: exp.cargo ? `  ·  ${exp.cargo}` : "", bold: true, size: 22, font: "Calibri", color: DARK }),
              ],
            }),
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: [exp.periodo, exp.localizacao].filter(Boolean).join("  |  "), size: 18, font: "Calibri", color: LIGHT_GRAY, italics: true }),
              ],
            })
          );
          if (exp.descricao) {
            children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: exp.descricao, size: 20, font: "Calibri", color: GRAY })] }));
          }
          (exp.responsabilidades || []).forEach((r) => {
            children.push(new Paragraph({
              spacing: { after: 30 },
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun({ text: r, size: 20, font: "Calibri", color: GRAY })],
            }));
          });
          if ((exp.resultados || []).length > 0) {
            children.push(new Paragraph({ spacing: { before: 60, after: 30 }, children: [new TextRun({ text: "Resultados", bold: true, size: 18, font: "Calibri", color: CYAN, allCaps: true })] }));
            exp.resultados.forEach((r) => {
              children.push(new Paragraph({
                spacing: { after: 30 },
                numbering: { reference: "results", level: 0 },
                children: [new TextRun({ text: r, size: 20, font: "Calibri", color: GRAY })],
              }));
            });
          }
        });
      }

      // Formação
      if ((cv.formacao || []).length > 0 && !hiddenSections.includes("formacao")) {
        addSectionHeader("FORMAÇÃO ACADÊMICA");
        cv.formacao.forEach((f) => {
          children.push(
            new Paragraph({
              spacing: { after: 20 },
              children: [new TextRun({ text: [f.nivel, f.curso].filter(Boolean).join(" "), bold: true, size: 21, font: "Calibri", color: DARK })],
            }),
            new Paragraph({
              spacing: { after: 20 },
              children: [new TextRun({ text: f.instituicao || "", size: 20, font: "Calibri", color: CYAN })],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [new TextRun({ text: f.periodo || "", size: 18, font: "Calibri", color: LIGHT_GRAY })],
            })
          );
        });
      }

      // Idiomas
      if ((cv.idiomas || []).length > 0 && !hiddenSections.includes("idiomas")) {
        addSectionHeader("IDIOMAS");
        cv.idiomas.forEach((idioma) => {
          children.push(new Paragraph({
            spacing: { after: 40 },
            numbering: { reference: "bullets", level: 0 },
            children: [new TextRun({ text: idioma, size: 20, font: "Calibri", color: GRAY })],
          }));
        });
      }

      // Footer
      children.push(
        new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } }, children: [] }),
        new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: "✦ ORION", bold: true, size: 18, font: "Calibri", color: CYAN }),
            new TextRun({ text: "  ·  Gerado automaticamente · CV Transformer", size: 18, font: "Calibri", color: LIGHT_GRAY }),
          ],
        })
      );

      const doc = new Document({
        numbering: {
          config: [
            {
              reference: "bullets",
              levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
            },
            {
              reference: "results",
              levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u25B8", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
            },
          ],
        },
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
            },
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const nomeArquivo = (cv.nome || "CV").replace(/\s+/g, "_");
      saveAs(blob, `CV_${nomeArquivo}_Orion.docx`);
    } catch (err) {
      console.error("Erro ao gerar Word:", err);
      alert("Erro ao gerar Word. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }, [cv, hiddenSections]);

  const setField = (path, value) => {
    setCv((prev) => deepSet({ ...prev }, path.split("."), value));
  };

  const addToArray = (path) => {
    const keys = path.split(".");
    setCv((prev) => {
      const next = { ...prev };
      const arr = getDeep(next, keys);
      setDeep(next, keys, [...(arr || []), ""]);
      return next;
    });
  };
  const removeFromArray = (path, idx) => {
    const keys = path.split(".");
    setCv((prev) => {
      const next = { ...prev };
      const arr = [...(getDeep(next, keys) || [])];
      arr.splice(idx, 1);
      setDeep(next, keys, arr);
      return next;
    });
  };
  const setArrayItem = (path, idx, val) => {
    const keys = path.split(".");
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
        { empresa: "", cargo: "", periodo: "", localizacao: "", descricao: "", responsabilidades: [], resultados: [] },
      ],
    }));
  const removeExp = (i) =>
    setCv((prev) => {
      const arr = [...prev.experiencias];
      arr.splice(i, 1);
      return { ...prev, experiencias: arr };
    });

  const addFormacao = () =>
    setCv((prev) => ({
      ...prev,
      formacao: [...(prev.formacao || []), { nivel: "", curso: "", instituicao: "", periodo: "" }],
    }));
  const removeFormacao = (i) =>
    setCv((prev) => {
      const arr = [...prev.formacao];
      arr.splice(i, 1);
      return { ...prev, formacao: arr };
    });

  return (
    <div style={S.previewPage}>
      <div style={S.toolbar}>
        <button onClick={onReset} style={S.toolbarBack}>← Novo CV</button>
        <span style={S.toolbarName}>{cv.nome}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setEditing((e) => !e)}
            style={{
              ...S.editToggleBtn,
              background: editing ? "#06B6D4" : "white",
              color: editing ? "white" : "#0F172A",
            }}
          >
            {editing ? "✓ Visualizar" : "✏️ Editar"}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{ ...S.printBtn, opacity: exporting ? 0.7 : 1, cursor: exporting ? "wait" : "pointer" }}
          >
            {exporting ? "⏳ Gerando..." : "⬇️ Baixar PDF"}
          </button>
          <button
            onClick={handleExportWord}
            disabled={exporting}
            style={{ ...S.printBtn, background: "#155E75", opacity: exporting ? 0.7 : 1, cursor: exporting ? "wait" : "pointer" }}
          >
            {exporting ? "⏳ Gerando..." : "📝 Baixar Word"}
          </button>
        </div>
      </div>

      {editing && (
        <div style={S.editBanner}>
          ✏️ <strong>Modo edição ativo</strong> — clique em qualquer campo para editar. Use{" "}
          <strong>"Visualizar"</strong> para ver o resultado limpo antes de baixar.
        </div>
      )}

      <div style={S.docWrapper}>
        <div ref={docRef}>
          <CVDoc
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

// utilitários de path profundo
function getDeep(obj, keys) {
  return keys.reduce((o, k) => (o != null ? o[k] : undefined), obj);
}
function setDeep(obj, keys, value) {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (Array.isArray(cur[keys[i]])) cur[keys[i]] = [...cur[keys[i]]];
    else cur[keys[i]] = { ...cur[keys[i]] };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return obj;
}
function deepSet(obj, keys, value) {
  return setDeep(obj, keys, value);
}

// ═══════════════════════════════════════════════
// DOCUMENTO CV
// ═══════════════════════════════════════════════
function CVDoc({
  cv, editing, setField, addToArray, removeFromArray, setArrayItem,
  addExp, removeExp, addFormacao, removeFormacao, hiddenSections = [], toggleSection = () => {},
}) {
  return (
    <div style={S.doc}>
      <div style={S.docHeader}>
        <div style={{ flex: 1 }}>
          <EditableText editing={editing} value={cv.nome} onChange={(v) => setField("nome", v)} style={S.docName} placeholder="Nome Completo" />
          <EditableText editing={editing} value={cv.cargo_titulo} onChange={(v) => setField("cargo_titulo", v)} style={S.docCargo} placeholder="Cargo / Especialidade" />
        </div>
        <div style={S.docContato}>
          <ContactLine icon="📍" editing={editing} value={cv.localizacao} onChange={(v) => setField("localizacao", v)} placeholder="Cidade - UF" />
          <ContactLine icon="📞" editing={editing} value={cv.telefone} onChange={(v) => setField("telefone", v)} placeholder="Telefone" />
          <ContactLine icon="✉️" editing={editing} value={cv.email} onChange={(v) => setField("email", v)} placeholder="E-mail" />
          <ContactLine icon="🔗" editing={editing} value={cv.linkedin} onChange={(v) => setField("linkedin", v)} placeholder="URL LinkedIn" isLink />
        </div>
      </div>

      <div style={S.docBody}>
        <Section title="RESUMO DAS QUALIFICAÇÕES" sectionKey="resumo" editing={editing} hidden={hiddenSections.includes("resumo")} onToggle={() => toggleSection("resumo")}>
          <EditableText editing={editing} value={cv.resumo} onChange={(v) => setField("resumo", v)} style={S.resumoText} placeholder="Resumo profissional..." multiline />
        </Section>

        <Section title="EXPERIÊNCIA PROFISSIONAL" sectionKey="experiencias" editing={editing} hidden={hiddenSections.includes("experiencias")} onToggle={() => toggleSection("experiencias")}>
          {(cv.experiencias || []).map((exp, i) => (
            <div key={i} style={{ ...S.expItem, marginBottom: i < cv.experiencias.length - 1 ? 24 : 0 }}>
              <div style={S.expHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <EditableText editing={editing} value={exp.empresa} onChange={(v) => setField(`experiencias.${i}.empresa`, v)} style={S.expEmpresa} placeholder="Empresa" inline />
                  {exp.empresa && exp.cargo && <span style={{ color: "#CBD5E1", fontSize: 13 }}> · </span>}
                  <EditableText editing={editing} value={exp.cargo} onChange={(v) => setField(`experiencias.${i}.cargo`, v)} style={S.expCargo} placeholder="Cargo" inline />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <EditableText editing={editing} value={exp.periodo} onChange={(v) => setField(`experiencias.${i}.periodo`, v)} style={S.expPeriodo} placeholder="Período" inline />
                  <EditableText editing={editing} value={exp.localizacao} onChange={(v) => setField(`experiencias.${i}.localizacao`, v)} style={S.expLocalizacao} placeholder="Localização" inline />
                  {editing && <button onClick={() => removeExp(i)} style={S.removeBtnRed}>✕ remover experiência</button>}
                </div>
              </div>
              <EditableText editing={editing} value={exp.descricao} onChange={(v) => setField(`experiencias.${i}.descricao`, v)} style={S.expDesc} placeholder="Descrição / contexto da função..." multiline />
              <BulletList editing={editing} items={exp.responsabilidades || []} dot="•" dotColor="#CBD5E1" placeholder="Responsabilidade..." addLabel="+ responsabilidade" onAdd={() => addToArray(`experiencias.${i}.responsabilidades`)} onRemove={(j) => removeFromArray(`experiencias.${i}.responsabilidades`, j)} onChange={(j, v) => setArrayItem(`experiencias.${i}.responsabilidades`, j, v)} />
              {((exp.resultados && exp.resultados.length > 0) || editing) && (
                <div style={S.resultadosBox}>
                  <span style={S.resultadosLabel}>Resultados</span>
                  <BulletList editing={editing} items={exp.resultados || []} dot="▸" dotColor="#06B6D4" placeholder="Resultado / entrega..." addLabel="+ resultado" onAdd={() => addToArray(`experiencias.${i}.resultados`)} onRemove={(j) => removeFromArray(`experiencias.${i}.resultados`, j)} onChange={(j, v) => setArrayItem(`experiencias.${i}.resultados`, j, v)} />
                </div>
              )}
            </div>
          ))}
          {editing && <button onClick={addExp} style={S.addBlockBtn}>+ adicionar experiência</button>}
        </Section>

        <div style={S.twoCol}>
          <div style={{ flex: 1 }}>
            <Section title="FORMAÇÃO ACADÊMICA" sectionKey="formacao" editing={editing} hidden={hiddenSections.includes("formacao")} onToggle={() => toggleSection("formacao")}>
              {(cv.formacao || []).map((f, i) => (
                <div key={i} style={{ marginBottom: 14, position: "relative" }}>
                  {editing && <button onClick={() => removeFormacao(i)} style={{ ...S.removeBtnRed, position: "absolute", top: 0, right: 0, fontSize: 10 }}>✕ remover</button>}
                  <EditableText editing={editing} value={[f.nivel, f.curso].filter(Boolean).join(" ")} onChange={(v) => setField(`formacao.${i}.curso`, v)} style={S.formacaoCurso} placeholder="Nível + Curso" />
                  <EditableText editing={editing} value={f.instituicao} onChange={(v) => setField(`formacao.${i}.instituicao`, v)} style={S.formacaoInst} placeholder="Instituição" />
                  <EditableText editing={editing} value={f.periodo} onChange={(v) => setField(`formacao.${i}.periodo`, v)} style={S.formacaoPeriodo} placeholder="Período" />
                </div>
              ))}
              {editing && <button onClick={addFormacao} style={S.addBlockBtn}>+ adicionar formação</button>}
            </Section>
          </div>
          <div style={{ flex: 1 }}>
            <Section title="IDIOMAS" sectionKey="idiomas" editing={editing} hidden={hiddenSections.includes("idiomas")} onToggle={() => toggleSection("idiomas")}>
              <BulletList editing={editing} items={cv.idiomas || []} dot="•" dotColor="#06B6D4" placeholder="Ex: Inglês avançado" addLabel="+ idioma" onAdd={() => addToArray("idiomas")} onRemove={(j) => removeFromArray("idiomas", j)} onChange={(j, v) => setArrayItem("idiomas", j, v)} chipStyle />
            </Section>
          </div>
        </div>

        <div style={S.footer}>
          <span style={{ color: "#06B6D4", fontWeight: 700 }}>✦ ORION</span>
          <span>Gerado automaticamente · CV Transformer</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════
function EditableText({ editing, value, onChange, style, placeholder, multiline, inline }) {
  const ref = useRef(null);
  if (!editing) {
    if (!value) return null;
    const Tag = inline ? "span" : "div";
    return <Tag style={style}>{value}</Tag>;
  }
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{
        ...style,
        outline: "none",
        borderBottom: "1.5px dashed #06B6D4",
        background: "rgba(6,182,212,0.03)",
        borderRadius: 2,
        padding: "1px 4px",
        cursor: "text",
        display: inline ? "inline-block" : "block",
        whiteSpace: multiline ? "pre-wrap" : "pre",
        minWidth: 40,
      }}
      onBlur={() => onChange(ref.current?.innerText?.trim() || "")}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      dangerouslySetInnerHTML={{ __html: value || "" }}
    />
  );
}

function ContactLine({ icon, editing, value, onChange, placeholder, isLink = false }) {
  if (!editing && !value) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
      <span style={{ color: "#06B6D4", fontSize: 12 }}>{icon}</span>
      {editing ? (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            background: "transparent", border: "none", borderBottom: "1.5px dashed #475569",
            color: "#CBD5E1", fontSize: 12, outline: "none", width: 170,
            textAlign: "right", fontFamily: "inherit",
          }}
        />
      ) : isLink ? (
        <a href={value} target="_blank" rel="noreferrer" style={{ color: "#06B6D4", textDecoration: "none", fontWeight: 600, fontSize: 12 }}>LinkedIn</a>
      ) : (
        <span style={{ color: "#CBD5E1", fontSize: 12 }}>{value}</span>
      )}
    </div>
  );
}

function BulletList({ editing, items, dot, dotColor, onAdd, onRemove, onChange, placeholder, addLabel, chipStyle = false }) {
  return (
    <div>
      {items.map((item, j) => (
        <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5 }}>
          <span style={{ color: dotColor, fontSize: 12, flexShrink: 0, marginTop: 3 }}>{dot}</span>
          {editing ? (
            <>
              <textarea
                value={item}
                onChange={(e) => onChange(j, e.target.value)}
                placeholder={placeholder}
                rows={2}
                style={{
                  flex: 1, fontSize: 12, color: "#475569", border: "none",
                  borderBottom: "1.5px dashed #06B6D4", outline: "none", resize: "vertical",
                  fontFamily: "inherit", lineHeight: 1.6, background: "rgba(6,182,212,0.03)",
                  padding: "2px 4px", borderRadius: 2,
                }}
              />
              <button onClick={() => onRemove(j)} style={S.removeInlineBtn} title="Remover">✕</button>
            </>
          ) : chipStyle ? (
            <span style={S.chip}>{item}</span>
          ) : (
            <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{item}</span>
          )}
        </div>
      ))}
      {editing && <button onClick={onAdd} style={S.addItemBtn}>{addLabel}</button>}
    </div>
  );
}

function Section({ title, children, editing, hidden, onToggle }) {
  return (
    <div style={{ ...S.section, opacity: hidden ? 0.4 : 1 }}>
      <div style={S.sectionHeader}>
        <span style={S.sectionTitle}>{title}</span>
        <div style={S.sectionLine} />
        {editing && (
          <button
            onClick={onToggle}
            title={hidden ? "Mostrar seção no CV" : "Ocultar seção do CV"}
            style={{
              background: hidden ? "#FEF2F2" : "#F0FDFE",
              border: `1px solid ${hidden ? "#FECACA" : "#A5F3FC"}`,
              borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer",
              color: hidden ? "#EF4444" : "#0E7490", fontFamily: "inherit", fontWeight: 600,
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {hidden ? "👁 Mostrar" : "🗑 Remover"}
          </button>
        )}
      </div>
      {!hidden && children}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════
const S = {
  uploadPage: { minHeight: "100vh", background: "linear-gradient(135deg,#F8FAFC,#E2F8FC)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  uploadHeader: { textAlign: "center", marginBottom: 40 },
  orionBadge: { display: "inline-block", background: "#0F172A", color: "#06B6D4", padding: "6px 16px", borderRadius: 99, fontSize: 12, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 16 },
  uploadTitle: { fontSize: 36, fontWeight: 800, color: "#0F172A", margin: "0 0 8px", letterSpacing: "-0.02em" },
  uploadSubtitle: { fontSize: 15, color: "#64748B", maxWidth: 420, lineHeight: 1.6, margin: 0 },
  dropZone: { width: "100%", maxWidth: 480, border: "2px dashed", borderRadius: 20, padding: "48px 32px", textAlign: "center", cursor: "pointer", transition: "all .2s", boxSizing: "border-box" },
  dropBtn: { display: "inline-block", background: "#06B6D4", color: "white", padding: "10px 24px", borderRadius: 99, fontSize: 13, fontWeight: 700 },
  errorBox: { marginTop: 16, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 10, padding: "12px 16px", fontSize: 13, maxWidth: 480, width: "100%", boxSizing: "border-box" },
  howTo: { marginTop: 32, background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px", maxWidth: 480, width: "100%", boxSizing: "border-box" },
  howToTitle: { fontSize: 12, fontWeight: 700, color: "#06B6D4", letterSpacing: "0.08em", margin: "0 0 10px", textTransform: "uppercase" },
  howToStep: { fontSize: 13, color: "#475569", margin: "4px 0" },
  fullCenter: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  loadingCard: { background: "white", borderRadius: 20, padding: "48px 64px", textAlign: "center", boxShadow: "0 4px 40px rgba(0,0,0,.08)" },
  spinner: { width: 48, height: 48, border: "4px solid #E2E8F0", borderTop: "4px solid #06B6D4", borderRadius: "50%", animation: "orion-spin .8s linear infinite", margin: "0 auto" },
  previewPage: { minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  toolbar: { position: "sticky", top: 0, zIndex: 100, background: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 8px rgba(0,0,0,.06)" },
  toolbarBack: { background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: "#64748B", cursor: "pointer", fontFamily: "inherit" },
  toolbarName: { flex: 1, fontWeight: 700, color: "#0F172A", fontSize: 15 },
  editToggleBtn: { border: "1.5px solid #06B6D4", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" },
  printBtn: { background: "#0F172A", color: "#06B6D4", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  editBanner: { background: "#F0FDFE", borderBottom: "1px solid #A5F3FC", padding: "10px 24px", fontSize: 13, color: "#0E7490", textAlign: "center" },
  docWrapper: { maxWidth: 860, margin: "32px auto", background: "white", boxShadow: "0 4px 40px rgba(0,0,0,.10)", borderRadius: 4, overflow: "hidden" },
  doc: { fontFamily: "'Segoe UI','Calibri',Arial,sans-serif", color: "#0F172A" },
  docHeader: { background: "#0F172A", padding: "36px 48px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 },
  docName: { margin: 0, fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.01em", display: "block" },
  docCargo: { margin: "6px 0 0", fontSize: 14, color: "#94A3B8", fontWeight: 400, lineHeight: 1.5, maxWidth: 420, display: "block" },
  docContato: { display: "flex", flexDirection: "column", gap: 6, textAlign: "right", flexShrink: 0, marginTop: 4 },
  docBody: { padding: "36px 48px" },
  section: { marginBottom: 28 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#06B6D4", textTransform: "uppercase", whiteSpace: "nowrap" },
  sectionLine: { flex: 1, height: 1, background: "#E2E8F0" },
  resumoText: { fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0, display: "block" },
  expItem: { paddingBottom: 22, borderBottom: "1px solid #F1F5F9" },
  expHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 16 },
  expEmpresa: { fontWeight: 700, color: "#06B6D4", fontSize: 13 },
  expCargo: { fontWeight: 600, color: "#0F172A", fontSize: 13 },
  expPeriodo: { fontSize: 11, color: "#64748B", flexShrink: 0, background: "#F8FAFC", padding: "3px 10px", borderRadius: 99, border: "1px solid #E2E8F0", display: "inline-block" },
  expLocalizacao: { fontSize: 10, color: "#94A3B8", fontStyle: "italic", display: "inline-block" },
  expDesc: { fontSize: 12, color: "#475569", margin: "4px 0 8px", lineHeight: 1.65, display: "block" },
  resultadosBox: { background: "#F0FDFE", border: "1px solid #CFFAFE", borderRadius: 8, padding: "10px 14px", marginTop: 8 },
  resultadosLabel: { fontSize: 11, fontWeight: 700, color: "#06B6D4", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 },
  twoCol: { display: "flex", gap: 40 },
  formacaoCurso: { margin: 0, fontWeight: 700, color: "#0F172A", fontSize: 13, display: "block" },
  formacaoInst: { margin: "2px 0 0", color: "#06B6D4", fontSize: 12, fontWeight: 600, display: "block" },
  formacaoPeriodo: { margin: "2px 0 0", color: "#94A3B8", fontSize: 11, display: "block" },
  chip: { background: "#F8FAFC", color: "#475569", border: "1px solid #E2E8F0", borderRadius: 99, padding: "3px 10px", fontSize: 11, display: "inline-block" },
  removeBtnRed: { background: "none", border: "none", cursor: "pointer", color: "#F87171", fontSize: 10, padding: "2px 4px", fontFamily: "inherit" },
  removeInlineBtn: { background: "none", border: "none", cursor: "pointer", color: "#F87171", fontSize: 12, padding: "0 2px", flexShrink: 0, fontFamily: "inherit", lineHeight: 1 },
  addItemBtn: { background: "none", border: "1px dashed #06B6D4", color: "#06B6D4", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", marginTop: 4, fontFamily: "inherit" },
  addBlockBtn: { background: "none", border: "1.5px dashed #06B6D4", color: "#06B6D4", borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer", marginTop: 12, fontFamily: "inherit", width: "100%", textAlign: "center", display: "block" },
  footer: { marginTop: 32, paddingTop: 16, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#CBD5E1" },
};
