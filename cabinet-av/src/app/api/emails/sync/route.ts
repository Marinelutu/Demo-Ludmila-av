import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { classifyEmails } from '@/lib/ai/classify-emails';
import { autoProcessEmail } from '@/lib/ai/auto-process-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    configured: !!(process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD),
    email: process.env.GMAIL_EMAIL || null,
  });
}

type NewEmail = {
  expeditor: string;
  subiect: string;
  continut: string;
  data: Date;
  status: string;
  hasAttachments: boolean;
  attachments: string;
};

// Conținut gol sau doar placeholder-ul vechi „(email de la ...)" — de re-extras.
function looksBlank(continut: string | null | undefined): boolean {
  if (!continut) return true;
  const t = continut.trim();
  return t.length === 0 || /^\(email de la .*\)$/.test(t);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST() {
  console.log('[sync] start — GMAIL_EMAIL:', process.env.GMAIL_EMAIL ? 'set' : 'NOT SET');

  const email = process.env.GMAIL_EMAIL;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!email || !appPassword) {
    return NextResponse.json(
      { error: 'EMAIL_NOT_CONFIGURED', message: 'Configurați GMAIL_EMAIL și GMAIL_APP_PASSWORD în .env.local' },
      { status: 503 }
    );
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  try {
    console.log('[sync] connecting to Gmail IMAP...');
    await client.connect();
    console.log('[sync] connected!');

    const lock = await client.getMailboxLock('INBOX');
    let savedRelevant = 0;
    let savedFiltered = 0;
    let healed = 0;

    try {
      // Fetch last 30 messages — full source so we can parse bodies reliably
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages || 0;
      const start = Math.max(1, total - 29);
      const range = `${start}:${total}`;

      console.log(`[sync] fetching messages ${range} (total ${total})`);

      const messages: Array<{ uid: number; flags: Set<string>; source: Buffer }> = [];

      for await (const msg of client.fetch(range, { uid: true, flags: true, source: true })) {
        if (msg.source) {
          messages.push({ uid: msg.uid, flags: msg.flags, source: msg.source });
        }
      }

      console.log(`[sync] fetched ${messages.length} messages, parsing + collecting new ones...`);

      // 1. Parse each message; collect NEW ones, and self-heal existing blank bodies
      const newEmails: NewEmail[] = [];
      for (const msg of messages) {
        const parsed = await simpleParser(msg.source);

        const expeditor = parsed.from?.value?.[0]?.address || 'necunoscut@unknown.com';
        const subiect = parsed.subject || '(fără subiect)';

        const plain = (parsed.text || '').trim();
        const continut =
          (plain || (parsed.html ? stripHtml(parsed.html) : '')).slice(0, 8000) ||
          `(email de la ${expeditor})`;

        const attachments = (parsed.attachments || [])
          .map((a) => a.filename)
          .filter((f): f is string => !!f);

        const data = parsed.date || new Date();
        const emailStatus = msg.flags.has('\\Seen') ? 'procesat' : 'nou';

        const existing = await prisma.email.findFirst({
          where: { sursa: 'gmail_sync', subiect, expeditor },
        });

        if (existing) {
          // Self-heal: an earlier sync may have saved a blank body — fill it now
          if (looksBlank(existing.continut) && !looksBlank(continut)) {
            await prisma.email.update({
              where: { id: existing.id },
              data: {
                continut,
                hasAttachments: attachments.length > 0,
                attachments: JSON.stringify(attachments),
              },
            });
            healed++;
            console.log(`[sync] healed body: ${subiect}`);
          }
          continue;
        }

        newEmails.push({
          expeditor,
          subiect,
          continut,
          data,
          status: emailStatus,
          hasAttachments: attachments.length > 0,
          attachments: JSON.stringify(attachments),
        });
      }

      console.log(`[sync] ${newEmails.length} new emails — classifying relevance...`);

      // 2. Classify all new emails for legal relevance in a single AI call
      const classifications = await classifyEmails(newEmails);

      // 3. Persist with relevance flag — irrelevant ones stay out of the dashboard
      const relevantIdsToProcess: string[] = [];
      for (let i = 0; i < newEmails.length; i++) {
        const e = newEmails[i];
        const cls = classifications[i] ?? { relevant: true, categorie: null };

        const created = await prisma.email.create({
          data: {
            expeditor: e.expeditor,
            destinatar: email,
            subiect: e.subiect,
            continut: e.continut,
            sursa: 'gmail_sync',
            data: e.data,
            status: e.status,
            hasAttachments: e.hasAttachments,
            attachments: e.attachments,
            relevant: cls.relevant,
            categorie: cls.categorie,
          },
        });

        if (cls.relevant) {
          savedRelevant++;
          relevantIdsToProcess.push(created.id);
        } else {
          savedFiltered++;
        }
        console.log(`[sync] saved (${cls.relevant ? 'relevant' : 'filtrat'}/${cls.categorie}): ${e.subiect}`);
      }

      // 4. Auto-process every new relevant email + any old unprocessed ones (catch-up).
      // Idempotent via aiProcessedAt — already-processed emails are skipped.
      // Limited to a small batch per sync so it stays fast.
      const existingUnprocessed = await prisma.email.findMany({
        where: { relevant: true, aiProcessedAt: null, id: { notIn: relevantIdsToProcess } },
        select: { id: true },
        orderBy: { data: 'desc' },
        take: 10,
      });
      const allToProcess = [...relevantIdsToProcess, ...existingUnprocessed.map((e) => e.id)];

      for (const eid of allToProcess) {
        try {
          const r = await autoProcessEmail(eid);
          console.log(
            `[sync] auto-processed ${eid}: linkedCase=${r.linkedCaseId ?? '-'} deadline=${r.deadlineCreated ? 'yes' : 'no'} attach=${r.attachmentsImported ?? 0}`
          );
        } catch (e) {
          console.error(`[sync] auto-process failed for ${eid}:`, e);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    const totalSaved = savedRelevant + savedFiltered;
    console.log(`[sync] done — ${savedRelevant} relevant, ${savedFiltered} filtered, ${healed} healed`);

    let message: string;
    if (totalSaved === 0) {
      message = healed > 0 ? `Inbox sincronizat — ${healed} emailuri actualizate` : 'Inbox sincronizat — nu sunt emailuri noi';
    } else if (savedFiltered === 0) {
      message = `${savedRelevant} emailuri noi importate din Gmail`;
    } else {
      message = `${savedRelevant} emailuri relevante importate, ${savedFiltered} filtrate ca nerelevante`;
    }

    return NextResponse.json({
      success: true,
      synced: savedRelevant,
      filtered: savedFiltered,
      healed,
      message,
    });
  } catch (error) {
    console.error('[sync] IMAP error:', error);
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 });
  }
}
