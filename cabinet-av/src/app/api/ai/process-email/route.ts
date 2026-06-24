import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { notifyEmailProcessed } from '@/lib/telegram/notify';

export async function POST(req: NextRequest) {
  try {
    const { emailId } = await req.json();

    if (!emailId) {
      return NextResponse.json({ error: 'No email ID provided' }, { status: 400 });
    }

    const [email, clients] = await Promise.all([
      prisma.email.findUnique({ where: { id: emailId } }),
      prisma.client.findMany({ select: { id: true, nume: true, prenume: true, email: true } }),
    ]);

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const clientList = clients.map(c => `- ID: ${c.id} | Nume: ${c.prenume} ${c.nume}${c.email ? ` | Email: ${c.email}` : ''}`).join('\n');

    const systemPrompt = `Ești un asistent juridic inteligent pentru un cabinet de avocatură din Republica Moldova.
Analizează emailul și returnează DOAR un obiect JSON valid (fără markdown, fără explicații):
{
  "rezumat": "Rezumat scurt, 2-3 propoziții, în română.",
  "actiune_necesara": "Acțiunea concretă recomandată avocatei (ex: 'Răspunde până la 20 iulie', 'Arhivează în dosarul civil nr. X'). Null dacă nu e necesară acțiune.",
  "client_potrivit_id": "ID-ul clientului din lista de mai jos care corespunde cel mai probabil, sau null dacă nu se potrivește niciunul.",
  "confidence": "high|medium|low",
  "este_hotarare": true/false,
  "este_citatie": true/false,
  "urgent": true/false
}

Lista clienți:
${clientList || '(nicio înregistrare)'}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `De la: ${email.expeditor}\nCătre: ${email.destinatar}\nSubiect: ${email.subiect}\n\nConținut:\n${email.continut}`,
      }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ;
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : raw);

    const updateData: Record<string, unknown> = {
      aiSummary: parsed.rezumat ?? null,
      aiAction: parsed.actiune_necesara ?? null,
    };

    if (parsed.client_potrivit_id && parsed.confidence !== 'low') {
      const match = clients.find(c => c.id === parsed.client_potrivit_id);
      if (match) updateData.clientId = match.id;
    }

    if (parsed.urgent) {
      updateData.status = 'urgent';
    }

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: updateData,
      include: { client: true },
    });

    void notifyEmailProcessed({
      expeditor: updatedEmail.expeditor,
      subiect: updatedEmail.subiect,
      rezumat: updatedEmail.aiSummary,
      actiune: updatedEmail.aiAction,
      clientName: updatedEmail.client ? `${updatedEmail.client.prenume} ${updatedEmail.client.nume}` : null,
      urgent: parsed.urgent === true,
    });

    return NextResponse.json({
      ...updatedEmail,
      _meta: {
        este_hotarare: parsed.este_hotarare,
        este_citatie: parsed.este_citatie,
        confidence: parsed.confidence,
      },
    });
  } catch (error) {
    console.error('Email Processing API Error:', error);
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
  }
}
