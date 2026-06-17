import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const STRUCTURE_PROMPT = `Extrage în JSON din transcriptul de mai jos:
{
  "nume_client": "string sau null",
  "natura_cazului": "civil" | "penal" | "familial" | "administrativ" | "comercial" | null,
  "fapte_cheie": ["string"] (max 5),
  "date_mentionate": [{"data": "string", "context": "string"}],
  "sume_mentionate": [{"suma": 0, "valuta": "string", "context": "string"}],
  "documente_necesare": ["string"],
  "actiuni_agreate": ["string"],
  "termene_critice": ["string"]
}
STRICT JSON, fără explicații.`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key lipsă' }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Fișier audio lipsă' }, { status: 400 });
    }

    // Whisper transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ro',
      response_format: 'text',
    });

    const transcript = transcription as unknown as string;

    // Structure with Claude (prompt §8.4)
    let structuredData = null;
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `${STRUCTURE_PROMPT}\n\nTranscript:\n${transcript}`,
            },
          ],
        });
        const raw = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonText = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        structuredData = JSON.parse(jsonText);
      } catch {
        // Structuring failed, return transcript only
      }
    }

    return NextResponse.json({ transcript, structuredData });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: 'Transcriere eșuată' }, { status: 500 });
  }
}
