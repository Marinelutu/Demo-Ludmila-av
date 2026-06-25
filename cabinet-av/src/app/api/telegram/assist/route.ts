import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { sendMessage, sendDocument, getFileUrl } from '@/lib/telegram/send';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { detectTemplateId, generateDocument } from '@/lib/document-templates';

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
}`;

function escapeTgHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

// Deterministic-template output is plain text — render it to a formatted .docx
// (bold headings for roman-numeral sections and ALL-CAPS titles).
async function templateTextToDocx(plainText: string): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: 'Cabinet Juridic Av. Ludmila Trofim',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
  ];

  for (const raw of plainText.split('\n')) {
    const line = raw.trim();
    if (!line) {
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      continue;
    }
    if (/^[IVX]+\.\s+[A-ZĂÂÎȘȚ\s]+$/.test(line) || /^[A-ZĂÂÎȘȚ\s]{6,}$/.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, bold: true, size: 24 })],
        spacing: { before: 240, after: 120 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
        spacing: { after: 100 },
        indent: line.startsWith('—') || line.startsWith('-') ? { left: 360 } : undefined,
      }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
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

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

      // Template path: deterministic generation for known document types.
      const templateId = detectTemplateId(docTip);
      if (templateId) {
        try {
          const docs = await prisma.document.findMany({
            where: {
              OR: [
                { clientId: matchedClient.id },
                ...(activeCase ? [{ caseId: activeCase.id }] : []),
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });
          const notes = await prisma.note.findMany({
            where: { clientId: matchedClient.id },
            take: 10,
          });
          const context = [
            `Client: ${matchedClient.prenume} ${matchedClient.nume}`,
            matchedClient.idnp ? `IDNP: ${matchedClient.idnp}` : '',
            matchedClient.adresa ? `Domiciliu: ${matchedClient.adresa}` : '',
            matchedClient.telefon ? `Telefon: ${matchedClient.telefon}` : '',
            matchedClient.email ? `Email: ${matchedClient.email}` : '',
            activeCase ? `Dosar: ${activeCase.numar} — ${activeCase.denumire} (instanța: ${activeCase.instanta || 'necunoscută'}${activeCase.judecator ? `, judecător: ${activeCase.judecator}` : ''})` : '',
            activeCase?.descriere ? `Descriere dosar: ${activeCase.descriere}` : '',
            ...docs.map((d) => `Document "${d.nume}": ${(d.textContent || d.ocrFields || '').slice(0, 1500)}`),
            ...notes.map((n) => `Notă: ${n.continut}`),
          ].filter(Boolean).join('\n');

          const { text, missingFields } = await generateDocument(templateId, context, anthropic);
          const docxBuffer = await templateTextToDocx(text);
          const filename = `${docTip.replace(/\s+/g, '_')}_${matchedClient.nume}.docx`;
          const caption = `📄 ${docTip} — ${matchedClient.prenume} ${matchedClient.nume}`
            + (missingFields.length ? `\n⚠️ De completat manual: ${missingFields.join(', ')}` : '');
          await sendDocument(chatId, docxBuffer, filename, caption, ASSIST_TOKEN);
          return NextResponse.json({ ok: true });
        } catch (err) {
          console.error('template generation failed, falling back to free-form:', err);
        }
      }

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

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
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

    // Photo → OCR (Gemini multimodal)
    if (photo && photo.length > 0) {
      if (!process.env.GEMINI_API_KEY) {
        await reply(chatId, '❌ Gemini API key lipsă. Configurați GEMINI_API_KEY în .env.local.');
        return NextResponse.json({ ok: true });
      }

      await reply(chatId, '📷 Procesez imaginea prin OCR...');
      const largestPhoto = photo[photo.length - 1];
      const fileUrl = await getFileUrl(largestPhoto.file_id, ASSIST_TOKEN || '');

      if (!fileUrl) {
        await reply(chatId, '❌ Nu am putut accesa imaginea.');
        return NextResponse.json({ ok: true });
      }

      const imgRes = await fetch(fileUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const compressed = await sharp(imgBuffer)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      const base64 = compressed.toString('base64');

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const ocrResult = await model.generateContent([
        OCR_PROMPT,
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      ]);

      const rawText = ocrResult.response.text().trim();
      const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

      let parsed: { tip_document?: string; campuri_identificate?: Array<{ nume_camp: string; valoare: string; confidence: number }> };
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        await reply(chatId, `📷 <b>Text extras (fallback)</b>\n\n${escapeTgHtml(rawText.slice(0, 1500))}`);
        return NextResponse.json({ ok: true });
      }

      const tip = parsed.tip_document || 'document';
      const campuri = parsed.campuri_identificate || [];

      const lines = [`📷 <b>OCR — ${escapeTgHtml(tip)}</b>`, ''];
      if (campuri.length === 0) {
        lines.push('<i>Niciun câmp identificat. Folosiți aplicația web pentru detalii.</i>');
      } else {
        for (const c of campuri.slice(0, 15)) {
          const icon = c.confidence >= 0.9 ? '✅' : c.confidence >= 0.7 ? '⚠️' : '❌';
          lines.push(`${icon} <b>${escapeTgHtml(c.nume_camp)}:</b> ${escapeTgHtml(String(c.valoare))}`);
        }
        if (campuri.length > 15) lines.push('', `<i>… ${campuri.length - 15} câmpuri suplimentare. Vedere completă în aplicație.</i>`);
      }

      await reply(chatId, lines.join('\n'));
      return NextResponse.json({ ok: true });
    }

    // Unknown command
    if (text.startsWith('/')) {
      await reply(chatId, '❓ Comandă necunoscută. Scrieți /start pentru a vedea comenzile disponibile.');
      return NextResponse.json({ ok: true });
    }

    // Plain text (orice mesaj liber, inclusiv link-uri) → răspuns AI juridic
    if (text) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        temperature: 0.2,
        system: `Ești asistentul juridic al cabinetului Av. Ludmila Trofim din Republica Moldova.
Răspunzi scurt, profesional, în română. Dacă primești un link, explică ce ar putea conține și cum poate fi util juridic.
Dacă primești o întrebare, răspunzi cu informații juridice din legislația RM.
Nu folosești markdown complex — doar text simplu cu emojis dacă e necesar.`,
        messages: [{ role: 'user', content: text }],
      });
      const answer = response.content[0].type === 'text' ? response.content[0].text : 'Nu am putut genera un răspuns.';
      await reply(chatId, `💬 ${answer}\n\n<i>Tip: /intreaba [întrebare] pentru consiliere detaliată • /document [client] [tip] pentru a genera un document</i>`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram assist webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
