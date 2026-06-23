import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { notifyDeadlines } from '@/lib/telegram/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { emailId } = await req.json();
    if (!emailId) {
      return NextResponse.json({ error: 'No email ID provided' }, { status: 400 });
    }

    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: { case: true },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }
    if (!email.caseId || !email.case) {
      return NextResponse.json(
        { error: 'NO_CASE', message: 'Legați mai întâi emailul la un dosar.' },
        { status: 400 }
      );
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const today = new Date().toISOString().slice(0, 10);
    const emailDate = new Date(email.data).toISOString().slice(0, 10);

    const systemPrompt = `Ești asistent juridic. Extrage din email termenul/data acțiunabilă pentru avocat (ședință de judecată, termen de apel, termen de răspuns, audiere etc.).
Data de azi: ${today}. Data emailului: ${emailDate}.
Reguli:
- Rezolvă datele relative la date absolute (ex: „în termen de 30 de zile de la comunicare" → calculează de la data emailului).
- Returnează DOAR JSON valid, fără markdown:
{"gasit": true, "data": "YYYY-MM-DD", "descriere": "scurtă descriere a termenului", "tip": "sedinta|apel|raspuns|audiere|altul"}
- Dacă nu există nicio dată/termen, returnează {"gasit": false}.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Subiect: ${email.subiect}\n\nConținut:\n${email.continut.slice(0, 4000)}`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : raw) as {
      gasit?: boolean;
      data?: string;
      descriere?: string;
      tip?: string;
    };

    if (!parsed.gasit || !parsed.data) {
      return NextResponse.json(
        { error: 'NO_DATE', message: 'Nu am găsit nicio dată/termen în acest email.' },
        { status: 422 }
      );
    }

    const dueDate = new Date(parsed.data);
    if (isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: 'NO_DATE', message: 'Data extrasă nu este validă.' },
        { status: 422 }
      );
    }

    const deadline = await prisma.deadline.create({
      data: {
        caseId: email.caseId,
        tip: parsed.tip || 'altul',
        data: dueDate,
        descriere: parsed.descriere || email.subiect,
        status: 'activ',
      },
    });

    // Notify lawyer on Telegram (best-effort)
    const zileRamase = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    void notifyDeadlines([
      {
        titlu: deadline.descriere || 'Termen nou',
        dataIso: dueDate.toISOString(),
        zileRamase,
        dosarNumar: email.case.numar,
      },
    ]);

    return NextResponse.json({
      success: true,
      deadline,
      caseNumar: email.case.numar,
      zileRamase,
    });
  } catch (error) {
    console.error('Extract deadline error:', error);
    return NextResponse.json({ error: 'Failed to extract deadline' }, { status: 500 });
  }
}
