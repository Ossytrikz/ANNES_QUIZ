export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
}

export async function buildResultsSummaryPdf(
  opts: {
    quizTitle: string;
    result: { score: number; total: number };
    resultDetails: Array<{ id: string; stem: string; ok: boolean | null; score: number; pts: number; your: any; correct: any; type?: string; origin?: string }>;
    meta?: { attemptId?: string; date?: string; duration?: string };
    logoUrl?: string;
  },
  filename: string
) {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const margin = 40;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = margin;

  const lh = (s:number)=>s*1.2;
  const ensure = (need:number)=>{ if (y + need > ph - margin) { doc.addPage(); y = margin; } };
  const text = (t:string, size=11, bold=false, color?:[number,number,number])=>{
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    if (color) doc.setTextColor(...color); else doc.setTextColor(0,0,0);
    const lines = doc.splitTextToSize(t, pw - margin*2);
    for (const line of lines) { ensure(lh(size)); doc.text(line, margin, y); y += lh(size); }
    doc.setTextColor(0,0,0);
  };
  const keyVal = (k:string, v:string)=>{
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    ensure(lh(11)); doc.text(k+':', margin, y);
    doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(v, pw - margin*2 - 110);
    doc.text(lines, margin+110, y);
    y += Math.max(lh(11), lh(11)*lines.length);
  };
  const divider = ()=>{ ensure(16); doc.setDrawColor(220); doc.line(margin, y, pw-margin, y); y += 10; doc.setDrawColor(0); };

  async function loadImageDataUrl(url?: string): Promise<string | null> {
    if (!url) return null;
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  const pct = opts.result.total ? Math.round((opts.result.score/opts.result.total)*100) : 0;
  // Header with optional logo
  const logoData = await loadImageDataUrl(opts.logoUrl);
  if (logoData) {
    const logoW = 120; // px
    const logoH = 40;  // px approx
    ensure(logoH);
    doc.addImage(logoData, 'PNG', margin, y, logoW, logoH, undefined, 'FAST');
    // Title to the right of logo
    doc.setFont('helvetica','bold'); doc.setFontSize(18);
    doc.text(`${opts.quizTitle} — Results Summary`, margin + logoW + 12, y + 24);
    y += logoH + 8;
  } else {
    text(`${opts.quizTitle} — Results Summary`, 18, true);
  }
  text(`Score: ${opts.result.score} / ${opts.result.total}  •  ${pct}%`, 12);
  if (opts.meta) {
    if (opts.meta.attemptId) keyVal('Attempt ID', opts.meta.attemptId);
    if (opts.meta.date) keyVal('Date', opts.meta.date);
    if (opts.meta.duration) keyVal('Duration', opts.meta.duration);
  }
  divider();
  text('Question Breakdown', 14, true);

  const green:[number,number,number] = [34,197,94];
  const red:[number,number,number] = [239,68,68];
  for (let i=0; i<opts.resultDetails.length; i++) {
    const d = opts.resultDetails[i];
    const tag = d.ok === null ? 'Ungraded' : (d.ok ? 'Correct' : 'Wrong');
    const color = d.ok === null ? undefined : (d.ok ? green : red);
    text(`Q${i+1} — ${d.type ?? ''} • ${tag} (${d.score}/${d.pts})`, 11, false, color as any);
    text(d.stem || '-', 11);
    if (d.origin) {
      keyVal('From quiz', d.origin);
    }
    const yourTxt = Array.isArray(d.your) ? d.your.join(', ') : (typeof d.your === 'string' ? d.your : JSON.stringify(d.your));
    const corrTxt = Array.isArray(d.correct) ? d.correct.join(', ') : (typeof d.correct === 'string' ? d.correct : JSON.stringify(d.correct));
    keyVal('Your answer', yourTxt || '-');
    keyVal('Correct answer', corrTxt || '-');
    divider();
  }
  doc.save(filename);
}
