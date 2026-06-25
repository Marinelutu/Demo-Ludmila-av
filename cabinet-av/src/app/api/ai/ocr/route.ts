import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

const OCR_PROMPT = `Analizează acest document juridic și extrage:

1. textul_complet: tot textul vizibil în document
2. tip_document: ce este (buletin / contract / citatie / hotarare / cerere / alt)
3. campuri_identificate: array de obiecte cu:
   - nume_camp (ex: "IDNP", "Nume", "Prenume", "Data nașterii", "Număr dosar", "Instanță")
   - valoare (textul extras)
   - confidence (0.0-1.0)
   - locatie (descriere zonă: "colț stânga sus", "centru pagină", etc)

Returnează STRICT JSON valid, fără markdown, fără explicații.

Format exact:
{
  "textul_complet": "...",
  "tip_document": "...",
  "campuri_identificate": [
    { "nume_camp": "...", "valoare": "...", "confidence": 0.0, "locatie": "..." }
  ]
}

Câmpurile cu confidence < 0.8 necesită verificare suplimentară.`;

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

    // Claude vision (images) + native PDF document blocks. The Gemini path was
    // dropped because the configured GEMINI_API_KEY is invalid; the Anthropic
    // key is valid and Claude handles both images and PDFs.
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

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: [mediaBlock, { type: 'text', text: OCR_PROMPT }] }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    // Strip markdown code blocks if present
    const jsonText = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    try {
      const parsed = JSON.parse(jsonText);
      return NextResponse.json(parsed);
    } catch {
      // Fallback if JSON parsing fails
      return NextResponse.json({
        textul_complet: text,
        tip_document: 'alt',
        campuri_identificate: [],
        parse_error: true,
      });
    }
  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Procesare OCR eșuată' }, { status: 500 });
  }
}
