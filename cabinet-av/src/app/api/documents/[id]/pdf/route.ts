import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';

export const dynamic = 'force-dynamic';

type Block = { type: 'h1' | 'h2' | 'h3' | 'p' | 'li'; text: string };

// Fonturi Unicode (cu diacritice românești) — căutăm un TTF disponibil în sistem.
// pdf-lib + fontkit le încorporează; dacă nu găsim niciunul, cădem pe fonturile
// standard (WinAnsi) cu transliterare ASCII a diacriticelor.
const FONT_CANDIDATES: Array<{ regular: string; bold: string }> = [
  { regular: '/System/Library/Fonts/Supplemental/Times New Roman.ttf', bold: '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf' },
  { regular: '/System/Library/Fonts/Supplemental/Georgia.ttf', bold: '/System/Library/Fonts/Supplemental/Georgia Bold.ttf' },
  { regular: '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', bold: '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf' },
  { regular: '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', bold: '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf' },
];

function transliterate(s: string): string {
  const map: Record<string, string> = {
    ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't',
    Ă: 'A', Â: 'A', Î: 'I', Ș: 'S', Ş: 'S', Ț: 'T', Ţ: 'T',
    '„': '"', '”': '"', '“': '"', '–': '-', '—': '-', '’': "'", '‘': "'",
  };
  return s.replace(/[ăâîșşțţĂÂÎȘŞȚŢ„”“–—’‘]/g, (c) => map[c] ?? c);
}

// Decodează entitățile HTML uzuale și curăță spațiile.
function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrage blocurile (titluri, paragrafe, elemente de listă) în ordinea documentului.
function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const re = /<(h1|h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase() as Block['type'];
    const text = decode(m[2]);
    if (text) blocks.push({ type: tag, text });
  }
  // Dacă nu există structură HTML, tratăm conținutul ca paragrafe simple.
  if (blocks.length === 0) {
    decode(html).split('\n').map((l) => l.trim()).filter(Boolean)
      .forEach((line) => blocks.push({ type: 'p', text: line }));
  }
  return blocks;
}

// Împarte un text în linii care încap în lățimea dată, la nivel de cuvânt.
function wrap(text: string, font: import('pdf-lib').PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'Document negăsit' }, { status: 404 });

  const source = doc.htmlContent || (doc.textContent ? `<p>${doc.textContent}</p>` : '<p>Document gol.</p>');
  const blocks = htmlToBlocks(source);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // Încercăm un font Unicode din sistem; altfel transliterăm.
  let font: PDFFont;
  let fontBold: PDFFont;
  let unicode = false;
  const picked = FONT_CANDIDATES.find((f) => fs.existsSync(f.regular));
  if (picked) {
    try {
      font = await pdf.embedFont(fs.readFileSync(picked.regular), { subset: true });
      fontBold = fs.existsSync(picked.bold)
        ? await pdf.embedFont(fs.readFileSync(picked.bold), { subset: true })
        : font;
      unicode = true;
    } catch {
      font = await pdf.embedFont(StandardFonts.TimesRoman);
      fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    }
  } else {
    font = await pdf.embedFont(StandardFonts.TimesRoman);
    fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  }
  const enc = (s: string) => (unicode ? s : transliterate(s));

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 56; // ~2cm
  const contentW = A4.w - margin * 2;
  const black = rgb(0.07, 0.07, 0.07);

  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
  };

  const STYLE: Record<Block['type'], { size: number; bold: boolean; center: boolean; before: number; after: number }> = {
    h1: { size: 16, bold: true, center: true, before: 10, after: 8 },
    h2: { size: 12, bold: true, center: true, before: 2, after: 10 },
    h3: { size: 12, bold: true, center: false, before: 12, after: 4 },
    p: { size: 12, bold: false, center: false, before: 0, after: 8 },
    li: { size: 12, bold: false, center: false, before: 0, after: 4 },
  };

  for (const block of blocks) {
    const st = STYLE[block.type];
    const f = st.bold ? fontBold : font;
    const text = enc(block.type === 'li' ? `•  ${block.text}` : block.text);
    const lineHeight = st.size * 1.5;
    y -= st.before;
    const lines = wrap(text, f, st.size, contentW);
    for (const line of lines) {
      ensureSpace(lineHeight);
      let x = margin;
      if (st.center) {
        const w = f.widthOfTextAtSize(line, st.size);
        x = margin + (contentW - w) / 2;
      }
      page.drawText(line, { x, y: y - st.size, size: st.size, font: f, color: black });
      y -= lineHeight;
    }
    y -= st.after;
  }

  const bytes = await pdf.save();
  const safeName = (doc.nume || 'document').replace(/[^a-z0-9ăâîșțéèA-ZĂÂÎȘȚ _.-]/gi, '_').slice(0, 80);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}.pdf"`,
      'Content-Length': String(bytes.length),
    },
  });
}
