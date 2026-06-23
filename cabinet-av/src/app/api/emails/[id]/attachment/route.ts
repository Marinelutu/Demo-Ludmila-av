import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const name = req.nextUrl.searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'No attachment name' }, { status: 400 });
  }

  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Only real Gmail-synced emails have downloadable bytes; seed/demo emails do not.
  if (email.sursa !== 'gmail_sync') {
    return NextResponse.json(
      { error: 'NOT_REAL', message: 'Doar atașamentele din emailurile sincronizate din Gmail pot fi descărcate.' },
      { status: 404 }
    );
  }

  const gmail = process.env.GMAIL_EMAIL;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmail || !appPassword) {
    return NextResponse.json({ error: 'EMAIL_NOT_CONFIGURED' }, { status: 503 });
  }

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
      // Find the original message by sender + subject
      const uids = await client.search(
        { from: email.expeditor, subject: email.subiect },
        { uid: true }
      );

      if (!uids || uids.length === 0) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Mesajul original nu a fost găsit în Gmail.' },
          { status: 404 }
        );
      }

      // Most recent match
      const uid = uids[uids.length - 1];
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) {
        return NextResponse.json({ error: 'NOT_FOUND', message: 'Mesajul nu a putut fi citit.' }, { status: 404 });
      }

      const parsed = await simpleParser(msg.source);
      const attachment = (parsed.attachments || []).find((a) => a.filename === name);

      if (!attachment) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Atașamentul nu a fost găsit în mesaj.' },
          { status: 404 }
        );
      }

      return new NextResponse(new Uint8Array(attachment.content), {
        status: 200,
        headers: {
          'Content-Type': attachment.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
          'Content-Length': String(attachment.size ?? attachment.content.length),
        },
      });
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error('[attachment] error:', error);
    return NextResponse.json({ error: 'Download failed', details: String(error) }, { status: 500 });
  } finally {
    await client.logout().catch(() => {});
  }
}
