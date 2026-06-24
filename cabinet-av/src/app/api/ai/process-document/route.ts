import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const [document, clients] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId },
        include: { client: true, case: true },
      }),
      prisma.client.findMany({ select: { id: true, nume: true, prenume: true } }),
    ]);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Strip HTML tags for analysis
    const rawContent = document.htmlContent
      ? document.htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : document.textContent || '';

    if (!rawContent.trim()) {
      return NextResponse.json({ error: 'Document has no text content to analyze' }, { status: 422 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const clientList = clients
      .map((c) => `- ID: ${c.id} | ${c.prenume} ${c.nume}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Ești un asistent juridic pentru un cabinet de avocatură din Republica Moldova.
Analizează documentul juridic și returnează STRICT un obiect JSON valid (fără markdown, fără explicații):
{
  "rezumat": "2-3 propoziții despre ce conține documentul",
  "client_potrivit_id": "ID din lista de clienți sau null dacă nu se potrivește",
  "sfaturi_juridice": ["sfat concret 1", "sfat concret 2"],
  "urmatori_pasi": ["pas 1", "pas 2", "pas 3"],
  "termen_extras": "Data ISO 8601 dacă există un termen limită în document, altfel null",
  "termen_descriere": "Descrierea termenului dacă există, altfel null",
  "tip_document": "contract|citatie|hotarare|cerere|notificare|procura|alt",
  "confidence": "high|medium|low"
}

Lista clienți:
${clientList || '(nicio înregistrare)'}

Document (primele 4000 caractere):
${rawContent.slice(0, 4000)}`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : raw);

    const updateData: Record<string, unknown> = {
      ocrFields: JSON.stringify(parsed),
      ocrStatus: 'ai_processed',
    };

    if (parsed.client_potrivit_id && parsed.confidence !== 'low' && !document.clientId) {
      const match = clients.find((c) => c.id === parsed.client_potrivit_id);
      if (match) updateData.clientId = match.id;
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
      include: { client: true },
    });

    return NextResponse.json({ ...updated, analysis: parsed });
  } catch (error) {
    console.error('Document AI processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
