import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/telegram/send';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

interface Message {
  role: 'client' | 'avocat';
  text: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, clientMessage } = await req.json();
    if (!conversationId || !clientMessage?.trim()) {
      return NextResponse.json({ error: 'Missing conversationId or clientMessage' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        client: {
          include: {
            cases: {
              where: { stare: { notIn: ['finalizat', 'arhivat'] } },
              take: 1,
            },
          },
        },
      },
    });

    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const existingMessages: Message[] = JSON.parse(conversation.recentMessages || '[]');

    const newClientMsg: Message = {
      role: 'client',
      text: clientMessage,
      timestamp: new Date().toISOString(),
    };

    let aiResponse: string | null = null;
    const messages: Message[] = [...existingMessages, newClientMsg];

    if (conversation.aiAuthorized && process.env.ANTHROPIC_API_KEY) {
      const { client } = conversation;
      const activeCase = client.cases[0];

      const systemPrompt = `Ești avocata Ludmila Trofim. Răspunzi unui client al tău pe ${conversation.platforma}.

Context client:
Nume: ${client.prenume} ${client.nume}
Telefon: ${client.telefon || 'necunoscut'}
Email: ${client.email || 'necunoscut'}

${activeCase ? `Dosarul activ:
Nr. ${activeCase.numar} — ${activeCase.denumire}
Tip: ${activeCase.tip}
Stare: ${activeCase.stare}
${activeCase.instanta ? `Instanță: ${activeCase.instanta}` : ''}` : 'Nu există dosare active.'}

Ultimele mesaje:
${existingMessages.slice(-5).map(m => `${m.role === 'client' ? client.prenume : 'Avocat'}: ${m.text}`).join('\n')}

Reguli:
- Răspunzi ca o avocată profesionistă, calm, politicos
- NU dai sfaturi juridice noi
- NU faci promisiuni
- NU negociezi onorarii
- Dacă întrebarea cere decizie juridică → "Vă voi suna în scurt timp pentru a discuta detaliile"
- Răspunsuri scurte, naturale, ca un mesaj real (nu formal de email)

Generează doar textul mesajului, fără ghilimele.`;

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: clientMessage }],
      });

      aiResponse = response.content[0].type === 'text' ? response.content[0].text : null;

      if (aiResponse) {
        messages.push({
          role: 'avocat',
          text: aiResponse,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Keep last 20 messages
    const trimmed = messages.slice(-20);

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        recentMessages: JSON.stringify(trimmed),
        lastActiveAt: new Date(),
      },
      include: { client: { select: { id: true, nume: true, prenume: true } } },
    });

    // Telegram notification to lawyer
    const lawyerChatId = process.env.TELEGRAM_LAWYER_CHAT_ID || '';
    const notifToken = process.env.TELEGRAM_BOT_NOTIF_TOKEN;
    const { client } = conversation;

    if (conversation.aiAuthorized && aiResponse) {
      await sendMessage(
        lawyerChatId,
        `🤖 <b>Răspuns AI trimis</b>\nClient: ${client.prenume} ${client.nume} (${conversation.platforma})\nMesaj: ${clientMessage}\nRăspuns AI: ${aiResponse}`,
        notifToken
      );
    } else {
      await sendMessage(
        lawyerChatId,
        `💬 <b>Mesaj nou</b> (AI dezactivat)\nClient: ${client.prenume} ${client.nume} (${conversation.platforma})\nMesaj: ${clientMessage}\n\n⚠️ Necesită răspuns manual.`,
        notifToken
      );
    }

    return NextResponse.json({
      conversation: { ...updated, recentMessages: JSON.stringify(trimmed) },
      aiResponse,
      messages: trimmed,
    });
  } catch (error) {
    console.error('Simulate error:', error);
    return NextResponse.json({ error: 'Failed to simulate message' }, { status: 500 });
  }
}
