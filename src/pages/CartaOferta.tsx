import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, Upload, Trash2, FileDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function CartaOferta() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    candidateName?: string;
    jobTitle?: string;
    companyName?: string;
    remuneration?: string;
    admissionDate?: string;
  } | null;

  const [formData, setFormData] = useState({
    candidateName: state?.candidateName || 'Nome do Candidato',
    jobTitle: state?.jobTitle || 'Cargo da Vaga',
    companyName: state?.companyName || 'Nome da Empresa',
    remuneration: state?.remuneration || 'R$ 0.000,00',
    contractType: 'CLT',
    isTemporary: false,
    duration: '',
    benefits: 'Vale Refeição, Plano de Saúde, Vale Transporte',
    admissionDate: state?.admissionDate || '',
    hasBonus: true,
    bonusDetails: 'Bônus anual baseado em metas de até 2 salários.',
  });

  const [logo, setLogo] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generatePDF = async () => {
    if (!documentRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(documentRef.current, {
        quality: 1,
        pixelRatio: 2,
        width: documentRef.current.scrollWidth,
        height: documentRef.current.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const pdfH = 297;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`Carta_Oferta_${formData.candidateName.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full print:block">
      {/* Sidebar Editor */}
      <div className="w-[380px] flex-shrink-0 border-r border-border bg-card overflow-y-auto print:hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold text-foreground">Carta Oferta</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-9">Edite os campos e gere o PDF</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Logótipo da Empresa
            </Label>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Carregar Logo
              </Button>
              {logo && (
                <Button variant="outline" size="icon" className="h-9 w-9 text-destructive" onClick={removeLogo}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Form fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Candidato</Label>
              <Input
                value={formData.candidateName}
                onChange={e => handleInputChange('candidateName', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cargo da Vaga</Label>
              <Input
                value={formData.jobTitle}
                onChange={e => handleInputChange('jobTitle', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa Cliente</Label>
              <Input
                value={formData.companyName}
                onChange={e => handleInputChange('companyName', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Contrato</Label>
              <Select value={formData.contractType} onValueChange={v => handleInputChange('contractType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remuneração</Label>
              <Input
                value={formData.remuneration}
                onChange={e => handleInputChange('remuneration', e.target.value)}
              />
            </div>
          </div>

          {formData.contractType === 'PJ' && (
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isTemporary}
                    onCheckedChange={v => handleInputChange('isTemporary', v)}
                  />
                  <Label className="text-xs">Contrato Temporário?</Label>
                </div>
                {formData.isTemporary && (
                  <Input
                    placeholder="Ex: 6 meses"
                    value={formData.duration}
                    onChange={e => handleInputChange('duration', e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Data de Início</Label>
            <Input
              type="date"
              value={formData.admissionDate}
              onChange={e => handleInputChange('admissionDate', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Benefícios</Label>
            <Textarea
              value={formData.benefits}
              onChange={e => handleInputChange('benefits', e.target.value)}
              rows={2}
            />
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.hasBonus}
                  onCheckedChange={v => handleInputChange('hasBonus', v)}
                />
                <Label className="text-xs font-semibold">Incluir Bônus?</Label>
              </div>
              {formData.hasBonus && (
                <Textarea
                  value={formData.bonusDetails}
                  onChange={e => handleInputChange('bonusDetails', e.target.value)}
                  rows={2}
                  placeholder="Ex: Bônus de 2 salários..."
                />
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-2">
            <Button onClick={generatePDF} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="flex-1 flex justify-center p-8 overflow-y-auto bg-muted/50 print:bg-white print:p-0">
        <div
          ref={documentRef}
          style={{
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: 'white',
            padding: '20mm 25mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Cormorant Garamond", serif',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="shadow-lg print:shadow-none print:m-0"
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '35px', borderBottom: '1px solid hsl(210 15% 85%)', paddingBottom: '25px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {logo ? (
                <img src={logo} alt="Logo" style={{ maxHeight: '80px', maxWidth: '350px', objectFit: 'contain' }} />
              ) : (
                <div style={{ 
                  width: '192px', height: '64px', borderRadius: '8px',
                  border: '2px dashed hsl(210 15% 85%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'hsl(215 20% 65%)', fontSize: '9px', fontWeight: 'bold', fontFamily: 'sans-serif'
                }}>
                  LOGÓTIPO
                </div>
              )}
            </div>
          </div>

          {/* Letter content */}
          <div style={{ textAlign: 'left', fontSize: '11pt', lineHeight: '1.6', color: 'hsl(222 47% 11%)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div>
              <p style={{ marginBottom: '20px' }}>Prezado(a) <strong>{formData.candidateName}</strong>,</p>

              <p style={{ marginBottom: '15px' }}>
                É com grande satisfação que, em nome da <strong>{formData.companyName}</strong>, formalizamos esta proposta de trabalho para integrar a nossa equipe na posição de <strong>{formData.jobTitle}</strong>.
              </p>

              <p style={{ marginBottom: '15px' }}>Abaixo, detalhamos as condições acordadas para esta oportunidade:</p>

              {/* Data Table */}
              <div style={{ 
                backgroundColor: 'hsl(210 20% 96%)', padding: '20px', borderRadius: '12px', 
                border: '1px solid hsl(210 15% 85%)', marginBottom: '25px', fontFamily: '"Inter", sans-serif' 
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid hsl(210 15% 85%)' }}>
                      <td style={{ padding: '10px 0', width: '35%', fontWeight: 'bold', color: 'hsl(215 20% 45%)', fontSize: '8pt', textTransform: 'uppercase' }}>Remuneração</td>
                      <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'hsl(222 47% 11%)' }}>{formData.remuneration}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid hsl(210 15% 85%)' }}>
                      <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'hsl(215 20% 45%)', fontSize: '8pt', textTransform: 'uppercase' }}>Tipo de Contrato</td>
                      <td style={{ padding: '10px 0', color: 'hsl(222 47% 11%)' }}>
                        <strong>{formData.contractType}</strong>
                        {formData.contractType === 'PJ' && formData.isTemporary && formData.duration && (
                          <span style={{ marginLeft: '10px', color: 'hsl(215 20% 45%)', fontStyle: 'italic', fontSize: '8.5pt' }}>
                            (Temporário - {formData.duration})
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid hsl(210 15% 85%)' }}>
                      <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'hsl(215 20% 45%)', fontSize: '8pt', textTransform: 'uppercase' }}>Data de Início</td>
                      <td style={{ padding: '10px 0', color: 'hsl(222 47% 11%)' }}>
                        {formData.admissionDate ? new Date(formData.admissionDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: formData.hasBonus ? '1px solid hsl(210 15% 85%)' : 'none' }}>
                      <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'hsl(215 20% 45%)', fontSize: '8pt', textTransform: 'uppercase' }}>Benefícios</td>
                      <td style={{ padding: '10px 0', color: 'hsl(222 47% 11%)', fontSize: '10pt' }}>{formData.benefits || 'Não se aplica'}</td>
                    </tr>
                    {formData.hasBonus && (
                      <tr>
                        <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'hsl(215 20% 45%)', fontSize: '8pt', textTransform: 'uppercase' }}>Bônus / Variável</td>
                        <td style={{ padding: '10px 0', color: 'hsl(222 47% 11%)', fontSize: '10pt' }}>{formData.bonusDetails}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p style={{ marginBottom: '20px' }}>Estamos entusiasmados com a sua chegada e acreditamos que a sua contribuição será fundamental para o nosso sucesso.</p>

              <p>Esta proposta é válida por 48 horas. Para aceitá-la, por favor assine o campo indicado abaixo.</p>
            </div>

            {/* Signature pushed to bottom */}
            <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
              <p>Atenciosamente,</p>
              <p style={{ fontWeight: 'bold', fontSize: '12pt', marginTop: '4px' }}>{formData.companyName}</p>
            </div>
          </div>

          {/* Candidate Signature */}
          <div>
            <div style={{ 
              width: '320px', borderTop: '2px solid hsl(222 47% 11%)', paddingTop: '10px', 
              textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginBottom: '10px' 
            }}>
              <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10pt', letterSpacing: '1px', marginBottom: '2px' }}>
                {formData.candidateName}
              </p>
              <p style={{ fontSize: '8pt', color: 'hsl(215 20% 45%)', fontStyle: 'italic', textTransform: 'uppercase' }}>
                Assinatura do Candidato
              </p>
            </div>
          </div>

          {/* Confidential Footer */}
          <div style={{ textAlign: 'center', fontSize: '7pt', color: 'hsl(210 15% 85%)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Documento Particular e Confidencial
          </div>
        </div>
      </div>
    </div>
  );
}
