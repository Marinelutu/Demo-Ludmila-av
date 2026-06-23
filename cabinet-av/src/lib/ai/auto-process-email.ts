import Anthropic from '@anthropic-ai/sdk';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import sharp from 'sharp';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { notifyEmailProcessed, notifyDeadlines } from '@/lib/telegram/notify';
import fs from 'fs';
import path from 'path';

type ClientOption = { id: string; nume: string; prenume: string; idnp: string | null; email: string | null };
type CaseOption = { id: string; numar: string; denumire: string; clientId: string };

type AIAnalysis = {
  rezumat: string | null;
  actiune: string | null;
  urgent: boolean;
  client_id: string | null;
  case_id: string | null;
  confidence: 'high' | 'medium' | 'low';
  termen_data: string | null;
  termen_descriere: string | null;
  termen_tip: string | null;
};

// Normalize for diacritic-insensitive matching (lawyers type without diacritics)
function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

// CONSERVATIVE auto-link threshold: AI says "high" AND we find a hard identifier
// (case number like "2-345/2024" or full client name) in subject/body.
function isHighConfidenceMatch(
  aiResult: AIAnalysis,
  email: { subiect: string; continut: string },
  client: ClientOption | null,
  caseItem: CaseOption | null
): { okClient: boolean; okCase: boolean } {
  if (aiResult.confidence !== 'high') return { okClient: false, okCase: false };

  const hay = normalize(`${email.subiect} ${email.continut}`);

  let okClient = false;
  if (client) {
    const fullName = normalize(`${client.prenume} ${client.nume}`);
    const altName = normalize(`${client.nume} ${client.prenume}`);
    const idnp = client.idnp ? client.idnp : '';
    okClient =
      hay.includes(fullName) ||
      hay.includes(altName) ||
      (!!idnp && hay.includes(idnp)) ||
      (!!client.email && hay.includes(client.email.toLowerCase()));
  }

  let okCase = false;
  if (caseItem) {
    // Case numbers are unambiguous, e.g. "2-345/2024"
    okCase = hay.includes(normalize(caseItem.numar));
  }

  return { okClient, okCase };
}

async function analyzeEmail(
  email: { expeditor: string; destinatar: string; subiect: string; continut: string; data: Date },
  clients: ClientOption[],
  cases: CaseOption[]
): Promise<AIAnalysis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today = new Date().toISOString().slice(0, 10);
  const emailDate = new Date(email.data).toISOString().slice(0, 10);

  const clientList = clients
    .map((c) => `- id="${c.id}" nume="${c.prenume} ${c.nume}"${c.idnp ? ` idnp="${c.idnp}"` : ''}${c.email ? ` email="${c.email}"` : ''}`)
    .join('\n');
  const caseList = cases
    .map((c) => `- id="${c.id}" numar="${c.numar}" denumire="${c.denumire}" clientId="${c.clientId}"`)
    .join('\n');

  const systemPrompt = `Ești asistent juridic pentru un cabinet de avocatură din Republica Moldova.
Data de azi: ${today}. Data emailului: ${emailDate}.

Analizează emailul și returnează DOAR un JSON valid (fără markdown):
{
  "rezumat": "2-3 propoziții în română, ce conține emailul",
  "actiune": "acțiune concretă pentru avocat sau null",
  "urgent": true/false,
  "client_id": "id-ul clientului din listă sau null",
  "case_id": "id-ul dosarului din listă sau null",
  "confidence": "high" | "medium" | "low",
  "termen_data": "YYYY-MM-DD sau null (rezolvă datele relative la dataemailului)",
  "termen_descriere": "scurtă descriere termen sau null",
  "termen_tip": "sedinta|apel|raspuns|audiere|depunere|altul sau null"
}

Reguli pentru confidence:
- "high" doar dacă identifici cu certitudine clientul SAU dosarul (nume complet menționat, sau număr dosar prezent)
- "medium" dacă există indicii dar nu certitudine
- "low" dacă nu se potrivește clar cu niciun client/dosar

CLIENȚI:
${clientList || '(niciunul)'}

DOSARE:
${caseList || '(niciunul)'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `De la: ${email.expeditor}\nCătre: ${email.destinatar}\nSubiect: ${email.subiect}\n\nConținut:\n${email.continut.slice(0, 5000)}`,
        },
      ],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const m = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    return JSON.parse(m ? m[1] : raw) as AIAnalysis;
  } catch (err) {
    console.error('[auto-process] AI analyze failed:', err);
    return null;
  }
}

type ExtractionResult = {
  text: string | null;
  html: string | null;
};

// Extract text + HTML from an attachment buffer.
// DOCX → mammoth HTML (preserves tables/headings/bold) + raw text.
// PDF/images → Gemini OCR (text only). TXT → utf-8.
async function extractAttachment(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractionResult> {
  const lower = filename.toLowerCase();
  const isImage = mimeType.startsWith('image/') || /\.(jpe?g|png|webp|heic|tiff)$/i.test(lower);
  const isPdf = mimeType === 'application/pdf' || lower.endsWith('.pdf');
  const isDocx = lower.endsWith('.docx');
  const isText = mimeType.startsWith('text/') || lower.endsWith('.txt');

  try {
    if (isDocx) {
      const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ buffer }),
        mammoth.extractRawText({ buffer }),
      ]);
      return {
        html: htmlResult.value.trim().slice(0, 500_000) || null,
        text: textResult.value.trim().slice(0, 50_000) || null,
      };
    }

    if (isText) {
      const text = buffer.toString('utf-8').trim().slice(0, 50_000);
      return { text, html: null };
    }

    if ((isImage || isPdf) && process.env.GEMINI_API_KEY) {
      let dataBuf = buffer;
      let mt = mimeType || (isPdf ? 'application/pdf' : 'image/jpeg');
      if (isImage) {
        dataBuf = await sharp(buffer)
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        mt = 'image/jpeg';
      }
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent([
        'Extrage tot textul vizibil din acest document juridic. Returnează doar textul, fără explicații.',
        { inlineData: { data: dataBuf.toString('base64'), mimeType: mt } },
      ]);
      const text = result.response.text().trim().slice(0, 50_000);
      return { text, html: null };
    }
  } catch (err) {
    console.error(`[auto-process] extraction failed for ${filename}:`, err);
  }
  return { text: null, html: null };
}

// Save attachment buffer to uploads/documents/ and return the file path.
function saveAttachmentFile(buffer: Buffer, filename: string, docId: string): string {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(uploadsDir, `${docId}_${safeName}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Fetch attachment bytes from Gmail by sender + subject lookup.
async function fetchGmailAttachments(
  expeditor: string,
  subiect: string
): Promise<Array<{ filename: string; content: Buffer; contentType: string }>> {
  const gmail = process.env.GMAIL_EMAIL;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmail || !appPassword) return [];

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: gmail, pass: appPassword },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ from: expeditor, subject: subiect }, { uid: true });
      if (!Array.isArray(uids) || !uids.length) return [];
      const uid = (uids as number[])[uids.length - 1];
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !('source' in msg) || !msg.source) return [];
      const parsed = await simpleParser(msg.source);
      return (parsed.attachments || [])
        .filter((a) => !!a.filename)
        .map((a) => ({
          filename: a.filename!,
          content: a.content as Buffer,
          contentType: a.contentType || 'application/octet-stream',
        }));
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('[auto-process] IMAP fetch failed:', err);
    return [];
  } finally {
    await client.logout().catch(() => {});
  }
}

export type AutoProcessResult = {
  alreadyProcessed?: boolean;
  ai?: AIAnalysis;
  linkedClientId?: string | null;
  linkedCaseId?: string | null;
  deadlineCreated?: boolean;
  attachmentsImported?: number;
};

// The heart: runs once per email, idempotent via aiProcessedAt.
export async function autoProcessEmail(emailId: string): Promise<AutoProcessResult> {
  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return {};
  if (email.aiProcessedAt) return { alreadyProcessed: true };

  const [clients, cases] = await Promise.all([
    prisma.client.findMany({ select: { id: true, nume: true, prenume: true, idnp: true, email: true } }),
    prisma.case.findMany({ select: { id: true, numar: true, denumire: true, clientId: true } }),
  ]);

  const ai = await analyzeEmail(email, clients, cases);
  if (!ai) {
    // No API key or AI failed — mark processed anyway to avoid loops
    await prisma.email.update({ where: { id: emailId }, data: { aiProcessedAt: new Date() } });
    return {};
  }

  // Resolve client/case from AI hints
  const aiClient = ai.client_id ? clients.find((c) => c.id === ai.client_id) || null : null;
  const aiCase = ai.case_id ? cases.find((c) => c.id === ai.case_id) || null : null;

  // Apply conservative threshold
  const gate = isHighConfidenceMatch(ai, email, aiClient, aiCase);
  let linkedClientId: string | null = null;
  let linkedCaseId: string | null = null;

  // If case matches and we know its client, that pins the client too
  if (gate.okCase && aiCase) {
    linkedCaseId = aiCase.id;
    linkedClientId = aiCase.clientId;
  } else if (gate.okClient && aiClient) {
    linkedClientId = aiClient.id;
  }

  // Update email with summary/action/urgency/links + mark processed
  const newStatus = ai.urgent ? 'urgent' : email.status === 'nou' ? 'nou' : email.status;
  await prisma.email.update({
    where: { id: emailId },
    data: {
      aiSummary: ai.rezumat,
      aiAction: ai.actiune,
      status: newStatus,
      clientId: linkedClientId ?? undefined,
      caseId: linkedCaseId ?? undefined,
      aiProcessedAt: new Date(),
    },
  });

  // Telegram notify (best-effort, fire-and-forget)
  const clientName =
    linkedClientId
      ? (() => {
          const c = clients.find((x) => x.id === linkedClientId);
          return c ? `${c.prenume} ${c.nume}` : null;
        })()
      : null;
  void notifyEmailProcessed({
    expeditor: email.expeditor,
    subiect: email.subiect,
    rezumat: ai.rezumat,
    actiune: ai.actiune,
    clientName,
    urgent: ai.urgent,
  });

  // If linked to a case and AI found a deadline → create it
  let deadlineCreated = false;
  if (linkedCaseId && ai.termen_data) {
    const due = new Date(ai.termen_data);
    if (!isNaN(due.getTime())) {
      // Dedup: any deadline on the same case+date is treated as the same termen
      // (AI may phrase descriptions slightly differently across runs).
      const dayStart = new Date(due); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(due); dayEnd.setHours(23, 59, 59, 999);
      const existing = await prisma.deadline.findFirst({
        where: { caseId: linkedCaseId, data: { gte: dayStart, lte: dayEnd } },
      });
      if (!existing) {
        await prisma.deadline.create({
          data: {
            caseId: linkedCaseId,
            tip: ai.termen_tip || 'altul',
            data: due,
            descriere: ai.termen_descriere || email.subiect,
            status: 'activ',
          },
        });
        deadlineCreated = true;
        const zileRamase = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const caseNum = cases.find((c) => c.id === linkedCaseId)?.numar || '';
        void notifyDeadlines([
          { titlu: ai.termen_descriere || email.subiect, dataIso: due.toISOString(), zileRamase, dosarNumar: caseNum },
        ]);
      }
    }
  }

  // If linked AND email is from real Gmail with attachments → import as Documents
  let attachmentsImported = 0;
  const attList: string[] = email.attachments ? JSON.parse(email.attachments) : [];
  if (linkedCaseId && email.sursa === 'gmail_sync' && attList.length > 0) {
    const realAttachments = await fetchGmailAttachments(email.expeditor, email.subiect);
    for (const att of realAttachments) {
      // Dedup: skip if Document with same name + caseId already exists
      const exists = await prisma.document.findFirst({
        where: { caseId: linkedCaseId, nume: att.filename },
      });
      if (exists) continue;

      const { text, html } = await extractAttachment(att.content, att.filename, att.contentType);

      // Create document first to get the generated ID, then save file using that ID
      const doc = await prisma.document.create({
        data: {
          nume: att.filename,
          tip: att.contentType.split('/')[1] || 'fisier',
          categorie: 'email_atasament',
          clientId: linkedClientId ?? undefined,
          caseId: linkedCaseId,
          htmlContent: html || null,
          textContent: text || null,
          ocrStatus: (html || text) ? 'ai_extracted' : null,
          ocrFields: JSON.stringify({
            source: 'email',
            emailId: email.id,
            expeditor: email.expeditor,
            subiect: email.subiect,
            extractedAt: new Date().toISOString(),
          }),
        },
      });

      // Save original file binary to disk and update filePath
      try {
        const filePath = saveAttachmentFile(att.content, att.filename, doc.id);
        await prisma.document.update({
          where: { id: doc.id },
          data: { filePath },
        });
      } catch (err) {
        console.error(`[auto-process] file save failed for ${att.filename}:`, err);
      }

      attachmentsImported++;
    }
  }

  return {
    ai,
    linkedClientId,
    linkedCaseId,
    deadlineCreated,
    attachmentsImported,
  };
}
