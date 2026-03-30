

## Plan: Fix CV Export — Add Word (.docx) Download

### Problem
The current PDF export captures the entire CV as a single image and slices it across A4 pages, cutting text mid-line at page breaks (as shown in the screenshot).

### Approach
Add a **"Baixar Word"** button alongside the existing PDF button. This is the more robust solution because:
- Word handles page breaks and text wrapping natively — no text will ever be cut
- The user explicitly mentioned Word export as a good alternative
- The user can then fine-tune formatting and export to PDF from Word if needed

Additionally, **fix the PDF export** to use section-based capture instead of one giant image slice, so each experience block stays intact across pages.

### Changes — `src/pages/FormatacaoCV.jsx`

1. **Add DOCX export function** (`handleExportWord`):
   - Use the `docx` npm library (Document, Packer, Paragraph, TextRun, etc.)
   - Map `cv` data to structured Word content preserving the CV layout:
     - Header: name, role, contact info
     - Sections: Resumo, Experiências (with bullets for responsibilities/results), Formação, Idiomas
   - Style with Orion brand colors (cyan accent `#06B6D4`, dark header)
   - Download as `.docx` file via Blob

2. **Fix PDF export** (`handleExportPDF`):
   - Add `data-pdf-section` attributes to each logical block in `CVDoc` (header, each experience, formação, idiomas)
   - Capture each section individually with `html-to-image`
   - Before placing on PDF page, check remaining space; if it won't fit, add new page
   - This prevents text from being cut mid-line

3. **Add Word button to toolbar** next to the existing PDF button

### Technical Details

- **New dependency**: `docx` (npm package for generating .docx files)
- The DOCX generation maps each CV section to Word paragraphs with proper formatting (bold titles, bullet lists, colored headings)
- PDF fix uses the same `toPng` + `jsPDF` stack but captures sections individually instead of the whole document at once

