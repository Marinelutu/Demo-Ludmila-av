import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { extractText, getDocumentProxy } from 'unpdf';

// Prompt pentru extragerea câmpurilor DIN TEXT (rapid — textul e deja extras).
const FIELDS_FROM_TEXT_PROMPT = `Mai jos este textul integral al unui document juridic din Republica Moldova. Pe baza lui, returnează STRICT JSON valid (fără markdown, fără explicații):

{
  "tip_document": "buletin | contract | citatie | hotarare | cerere | proces-verbal | alt",
  "campuri_identificate": [
    { "nume_camp": "...", "valoare": "...", "confidence": 0.0 }
  ]
}

Extrage câmpurile-cheie relevante (ex: "Număr dosar", "Instanță", "Judecător", "Nume", "Prenume", "IDNP", "Data", "Articol invocat", "Sumă"). confidence între 0 și 1.`;

// Prompt complet pentru imagini / PDF scanat (fără strat de text) — vision.
const OCR_VISION_PROMPT = `Analizează acest document juridic și extrage:

1. textul_complet: tot textul vizibil în document
2. tip_document: ce este (buletin / contract / citatie / hotarare / cerere / alt)
3. campuri_identificate: array de obiecte cu:
   - nume_camp (ex: "IDNP", "Nume", "Prenume", "Data nașterii", "Număr dosar", "Instanță")
   - valoare (textul extras)
   - confidence (0.0-1.0)
   - locatie (descriere zonă)

Returnează STRICT JSON valid, fără markdown, fără explicații.

Format exact:
{
  "textul_complet": "...",
  "tip_document": "...",
  "campuri_identificate": [
    { "nume_camp": "...", "valoare": "...", "confidence": 0.0, "locatie": "..." }
  ]
}`;

function extractJson(raw: string): unknown | null {
  if (!raw) return null;
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function cleanFallbackText(raw: string): string {
  const t = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const m = t.match(/"textul_complet"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) {
    try {
      return JSON.parse(`"${m[1]}"`);
    } catch {
      return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }
  return t;
}

// Cale RAPIDĂ pentru PDF-uri digitale (cu strat de text): textul e extras
// direct (instant), iar modelul e folosit DOAR pentru câmpuri (output mic →
// rapid). Astfel un dosar de 6 pagini se procesează în câteva secunde, nu minute.
async function extractFieldsFromText(anthropic: Anthropic, fullText: string) {
  // Limităm textul trimis modelului (câmpurile sunt de obicei în primele pagini).
  const sample = fullText.length > 12000 ? fullText.slice(0, 12000) : fullText;
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: `${FIELDS_FROM_TEXT_PROMPT}\n\n--- TEXT DOCUMENT ---\n${sample}` }],
  });
  const block = resp.content[0];
  const text = block && block.type === 'text' ? block.text.trim() : '';
  const parsed = extractJson(text) as { tip_document?: string; campuri_identificate?: unknown[] } | null;
  return {
    tip_document: parsed?.tip_document || 'alt',
    campuri_identificate: Array.isArray(parsed?.campuri_identificate) ? parsed!.campuri_identificate : [],
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key lipsă' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Fișier lipsă' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // ── Cale rapidă: PDF digital (are strat de text) ──────────────────────
    if (isPdf) {
      try {
        const pdfProxy = await getDocumentProxy(new Uint8Array(inputBuffer));
        const { text } = await extractText(pdfProxy, { mergePages: true });
        const fullText = (Array.isArray(text) ? text.join('\n') : text || '').trim();
        // Dacă PDF-ul are text real (nu e doar scan), îl folosim direct.
        if (fullText.replace(/\s+/g, ' ').length > 80) {
          const fields = await extractFieldsFromText(anthropic, fullText);
          return NextResponse.json({
            textul_complet: fullText,
            tip_document: fields.tip_document,
            campuri_identificate: fields.campuri_identificate,
          });
        }
      } catch (e) {
        console.error('unpdf extract failed, fallback to vision:', e);
      }
    }

    // ── Cale vision: imagini sau PDF scanat (fără text) ───────────────────
    const mediaBlock: Anthropic.ContentBlockParam = isPdf
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: inputBuffer.toString('base64') },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: (
              await sharp(inputBuffer)
                .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer()
            ).toString('base64'),
          },
        };

    // Streaming (SDK cere streaming la max_tokens mare). 16000 e suficient
    // pentru un document scanat și limitează generarea fugitivă.
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: [mediaBlock, { type: 'text', text: OCR_VISION_PROMPT }] }],
    });
    const response = await stream.finalMessage();
    const firstBlock = response.content[0];
    const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text.trim() : '';

    const parsed = extractJson(text);
    if (parsed) {
      return NextResponse.json(parsed);
    }

    return NextResponse.json({
      textul_complet: cleanFallbackText(text),
      tip_document: 'alt',
      campuri_identificate: [],
      parse_error: true,
    });
  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Procesare OCR eșuată' }, { status: 500 });
  }
}
