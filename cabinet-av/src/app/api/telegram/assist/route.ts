import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { sendMessage, sendDocument, getFileUrl } from '@/lib/telegram/send';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { detectTemplateId, generateDocument } from '@/lib/document-templates';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const ASSIST_TOKEN = process.env.TELEGRAM_BOT_ASSIST_TOKEN;

async function reply(chatId: string, text: string) {
  await sendMessage(chatId, text, ASSIST_TOKEN);
}

async function generateDocx(plainText: string): Promise<Buffer> {
  const lines = plainText.split('\n').map(l => l.trimEnd());
  const alreadyHasHeader = plainText.trimStart().startsWith('Cabinet Juridic');

  const children: Paragraph[] = alreadyHasHeader ? [] : [
    new Paragraph({
      text: 'Cabinet Juridic Av. Ludmila Trofim',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      continue;
    }
    // Lines starting with ## → sub-heading
    if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        text: trimmed.slice(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }));
    // Lines starting with # → heading
    } else if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({
        text: trimmed.slice(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
      }));
    // ALL-CAPS lines (section titles like "I. DATELE PĂRȚILOR")
    } else if (/^[IVX]+\.\s+[A-ZĂÂÎȘȚ\s]+$/.test(trimmed) || /^[A-ZĂÂÎȘȚ\s]{6,}$/.test(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 24 })],
        spacing: { before: 240, after: 120 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 24 })],
        spacing: { after: 100 },
        indent: trimmed.startsWith('—') || trimmed.startsWith('-') ? { left: 360 } : undefined,
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
        include: {
          cases: {
            orderBy: { createdAt: 'desc' },
            select: { numar: true, denumire: true, tip: true, instanta: true, judecator: true, stare: true, articole: true, sumaLitigiu: true, descriere: true },
          },
          documents: {
            select: { nume: true, tip: true, textContent: true, htmlContent: true, ocrFields: true },
          },
          consultations: {
            orderBy: { createdAt: 'desc' },
            select: { transcript: true, structuredData: true },
          },
          notes: { select: { continut: true } },
        },
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

      // Build full context string for the extractor
      const stripHtml = (html: string) =>
        html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<span[^>]*class="needs-confirmation"[^>]*>([\s\S]*?)<\/span>/gi, '[DE VERIFICAT: $1]')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const clientContext = [
        `=== DATE CLIENT ===`,
        `Nume complet: ${matchedClient.prenume} ${matchedClient.nume}`,
        matchedClient.idnp && `IDNP: ${matchedClient.idnp}`,
        matchedClient.telefon && `Telefon: ${matchedClient.telefon}`,
        matchedClient.email && `Email: ${matchedClient.email}`,
        matchedClient.adresa && `Adresă: ${matchedClient.adresa}`,
        matchedClient.note && `Note client: ${matchedClient.note}`,

        matchedClient.cases.length > 0 && `\n=== DOSARE ===`,
        ...matchedClient.cases.map(c =>
          `Dosar ${c.numar}: ${c.denumire} (${c.tip}, ${c.stare})` +
          (c.instanta ? `, instanța: ${c.instanta}` : '') +
          (c.judecator ? `, judecător: ${c.judecator}` : '') +
          (c.articole ? `, articole: ${c.articole}` : '') +
          (c.sumaLitigiu ? `, sumă litigiu: ${c.sumaLitigiu} lei` : '') +
          (c.descriere ? `\n  ${c.descriere}` : '')
        ),

        matchedClient.documents.length > 0 && `\n=== DOCUMENTE DIN DOSAR ===`,
        ...matchedClient.documents.map(d => {
          const parts: string[] = [];
          if (d.textContent?.trim()) parts.push(d.textContent.trim());
          if (d.htmlContent?.trim()) {
            const stripped = stripHtml(d.htmlContent);
            if (stripped && stripped !== d.textContent?.trim()) parts.push(stripped);
          }
          if (d.ocrFields) {
            try {
              const fields = JSON.parse(d.ocrFields) as Array<{ nume_camp: string; valoare: string }>;
              parts.push('OCR: ' + fields.map(f => `${f.nume_camp}=${f.valoare}`).join(', '));
            } catch { /* ignore */ }
          }
          return `[${d.tip}] ${d.nume}:\n  ${parts.join(' | ').slice(0, 1200)}`;
        }),

        matchedClient.consultations.length > 0 && `\n=== CONSULTAȚII ===`,
        ...matchedClient.consultations.map(c => {
          let structured = '';
          if (c.structuredData) {
            try { structured = '\n  Date structurate: ' + JSON.stringify(JSON.parse(c.structuredData)); } catch { /* ignore */ }
          }
          return `Consultație:\n  ${(c.transcript || '').slice(0, 800)}${structured}`;
        }),

        matchedClient.notes.length > 0 && `\n=== NOTE INTERNE ===`,
        ...matchedClient.notes.map(n => `- ${n.continut}`),
      ].filter(Boolean).join('\n');

      // Detect template or fall back to free-form
      const templateId = detectTemplateId(docTip);

      let plainText: string;
      let missingNote = '';

      if (templateId) {
        const result = await generateDocument(templateId, clientContext, anthropic);
        plainText = result.text;
        if (result.missingFields.length > 0) {
          missingNote = `\n\n⚠️ Câmpuri lipsă în baza de date: ${result.missingFields.join(', ')}`;
        }
      } else {
        // Fallback: free-form for unknown document types
        const genResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          temperature: 0,
          system: `Ești asistentul juridic al Av. Ludmila Trofim. Generezi TEXT SIMPLU (fără HTML/CSS). Structura fixă: I. DATELE PĂRȚILOR, II. OBIECTUL, III. SITUAȚIA DE FAPT, IV. TEMEI JURIDIC, V. SOLICITĂRI, VI. DOCUMENTE ANEXATE, VII. SEMNĂTURI. Folosești datele furnizate. [DE COMPLETAT] doar pentru ce lipsește.`,
          messages: [{ role: 'user', content: `Tip: ${docTip}\n\n${clientContext}` }],
        });
        plainText = genResponse.content[0].type === 'text' ? genResponse.content[0].text : '';
      }

      const docxBuffer = await generateDocx(plainText);
      const filename = `${docTip.replace(/\s+/g, '_')}_${matchedClient.nume}.docx`;
      const caption = `📄 ${docTip} — ${matchedClient.prenume} ${matchedClient.nume}${missingNote}`;

      await sendDocument(chatId, docxBuffer, filename, caption, ASSIST_TOKEN);
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
