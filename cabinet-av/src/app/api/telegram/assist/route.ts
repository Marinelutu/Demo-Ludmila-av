import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { sendMessage, sendDocument, getFileUrl } from '@/lib/telegram/send';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const ASSIST_TOKEN = process.env.TELEGRAM_BOT_ASSIST_TOKEN;

async function reply(chatId: string, text: string) {
  await sendMessage(chatId, text, ASSIST_TOKEN);
}

async function generateHtmlToDocx(html: string): Promise<Buffer> {
  const lines = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const paragraphs = lines.map(line =>
    new Paragraph({
      children: [new TextRun({ text: line, size: 24 })],
      spacing: { after: 120 },
    })
  );

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'Document generat de Cabinet Juridic Ludmila Trofim',
          heading: HeadingLevel.HEADING_1,
        }),
        ...paragraphs,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text: string = message.text || '';
    const voice = message.voice;
    const photo = message.photo;

    // /start
    if (text === '/start' || text.startsWith('/start ')) {
      await reply(chatId, `👋 <b>Cabinet Juridic Ludmila Trofim</b>\n\nComenzile disponibile:\n\n/document [client] [tip] — Generează un document\nExemplu: <code>/document Maria Popescu cerere divort</code>\n\n/intreaba [întrebare] — Chat cu asistentul juridic AI\nExemplu: <code>/intreaba Care este termenul de prescripție în Moldova?</code>\n\n📷 Trimite o poză — OCR și extragere date\n🎤 Trimite un mesaj vocal — Transcriere consultație`);
      return NextResponse.json({ ok: true });
    }

    // /document [client_name] [tip]
    if (text.startsWith('/document ')) {
      const args = text.slice('/document '.length).trim();
      if (!args) {
        await reply(chatId, '❌ Folosiți: /document [Prenume Nume] [tip document]\nExemplu: /document Maria Popescu cerere divort');
        return NextResponse.json({ ok: true });
      }

      await reply(chatId, '⏳ Generez documentul...');

      const clients = await prisma.client.findMany({
        include: { cases: { take: 1, orderBy: { createdAt: 'desc' } } },
      });

      let matchedClient = null;
      let docTip = args;

      for (const c of clients) {
        const fullName = `${c.prenume} ${c.nume}`.toLowerCase();
        if (args.toLowerCase().startsWith(fullName)) {
          matchedClient = c;
          docTip = args.slice(fullName.length).trim() || 'document juridic';
          break;
        }
      }

      if (!matchedClient) {
        await reply(chatId, `❌ Client negăsit în "${args}". Verificați numele complet.`);
        return NextResponse.json({ ok: true });
      }

      const activeCase = matchedClient.cases[0];

      const genResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        temperature: 0.2,
        system: `Ești un asistent juridic specializat în dreptul Republicii Moldova. Generezi documente juridice profesionale în HTML curat. Marchezi cu <span class="needs-confirmation">TEXT</span> valorile incerte.`,
        messages: [{
          role: 'user',
          content: `Tip document: ${docTip}\nClient: ${matchedClient.prenume} ${matchedClient.nume}, IDNP ${matchedClient.idnp || 'necunoscut'}\n${activeCase ? `Dosar: ${activeCase.numar} — ${activeCase.denumire}` : ''}\n\nGenerează documentul complet.`,
        }],
      });

      const htmlContent = genResponse.content[0].type === 'text' ? genResponse.content[0].text : '';
      const docxBuffer = await generateHtmlToDocx(htmlContent);
      const filename = `${docTip.replace(/\s+/g, '_')}_${matchedClient.nume}.docx`;

      await sendDocument(chatId, docxBuffer, filename, `📄 ${docTip} — ${matchedClient.prenume} ${matchedClient.nume}`, ASSIST_TOKEN);
      return NextResponse.json({ ok: true });
    }

    // /intreaba [text]
    if (text.startsWith('/intreaba ')) {
      const question = text.slice('/intreaba '.length).trim();
      if (!question) {
        await reply(chatId, '❌ Folosiți: /intreaba [întrebarea dvs.]');
        return NextResponse.json({ ok: true });
      }

      await reply(chatId, '⏳ Caut răspunsul...');

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        temperature: 0.2,
        system: 'Ești un asistent juridic expert în dreptul Republicii Moldova. Răspunzi scurt și precis, citând articole de lege. Folosești text simplu fără markdown complex (Telegram îl afișează ca text brut dacă nu e HTML).',
        messages: [{ role: 'user', content: question }],
      });

      const answer = response.content[0].type === 'text' ? response.content[0].text : 'Nu am putut genera un răspuns.';
      await reply(chatId, `💬 <b>Răspuns juridic AI:</b>\n\n${answer}`);
      return NextResponse.json({ ok: true });
    }

    // Voice message → transcription
    if (voice) {
      await reply(chatId, '🎤 Procesez mesajul vocal...');
      const fileUrl = await getFileUrl(voice.file_id, ASSIST_TOKEN || '');
      if (!fileUrl) {
        await reply(chatId, '❌ Nu am putut accesa fișierul vocal.');
        return NextResponse.json({ ok: true });
      }

      const audioRes = await fetch(fileUrl);
      const audioBuffer = await audioRes.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });

      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.ogg');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ro');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      });

      if (!whisperRes.ok) {
        await reply(chatId, '❌ Eroare la transcriere. Verificați cheia OpenAI API.');
        return NextResponse.json({ ok: true });
      }

      const { text: transcript } = await whisperRes.json();
      await reply(chatId, `📝 <b>Transcriere:</b>\n\n${transcript}\n\n<i>Folosiți /intreaba [text] pentru a obține consiliere pe baza acestui transcript.</i>`);
      return NextResponse.json({ ok: true });
    }

    // Photo → OCR
    if (photo && photo.length > 0) {
      await reply(chatId, '📷 Procesez imaginea prin OCR...');
      const largestPhoto = photo[photo.length - 1];
      const fileUrl = await getFileUrl(largestPhoto.file_id, ASSIST_TOKEN || '');

      if (!fileUrl) {
        await reply(chatId, '❌ Nu am putut accesa imaginea.');
        return NextResponse.json({ ok: true });
      }

      await reply(chatId, `🔍 <b>OCR activat</b>\n\nPentru extragere completă de câmpuri, folosiți aplicația web: deschideți modulul <b>Documente → Upload & OCR</b>.\n\nURL imagine procesat: ${fileUrl}`);
      return NextResponse.json({ ok: true });
    }

    // Unknown command
    if (text.startsWith('/')) {
      await reply(chatId, '❓ Comandă necunoscută. Scrieți /start pentru a vedea comenzile disponibile.');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram assist webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
