import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key lipsă' }, { status: 500 });
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

    let base64: string;
    let mimeType: string;

    if (isPdf) {
      // Gemini acceptă PDF direct — nu îl trecem prin sharp (care e doar pentru imagini)
      base64 = inputBuffer.toString('base64');
      mimeType = 'application/pdf';
    } else {
      // Imagine: compresie cu sharp (resize max 2000px, JPEG quality 85)
      const compressedBuffer = await sharp(inputBuffer)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      base64 = compressedBuffer.toString('base64');
      mimeType = 'image/jpeg';
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      OCR_PROMPT,
      { inlineData: { data: base64, mimeType } },
    ]);

    const text = result.response.text().trim();

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
