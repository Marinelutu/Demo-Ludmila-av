import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyEmails } from '@/lib/ai/classify-emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Reclasifică emailurile importate din Gmail care nu au fost încă filtrate
// (categorie lipsă) — folosit pentru a curăța inbox-ul de mesaje vechi
// importate înainte de activarea filtrului.
export async function POST() {
  const emails = await prisma.email.findMany({
    where: { sursa: 'gmail_sync', categorie: null },
    select: { id: true, expeditor: true, subiect: true, continut: true },
  });

  if (emails.length === 0) {
    return NextResponse.json({ success: true, reclassified: 0, filtered: 0, message: 'Nimic de reclasificat' });
  }

  const classifications = await classifyEmails(emails);

  let filtered = 0;
  for (let i = 0; i < emails.length; i++) {
    const cls = classifications[i] ?? { relevant: true, categorie: null };
    await prisma.email.update({
      where: { id: emails[i].id },
      data: { relevant: cls.relevant, categorie: cls.categorie },
    });
    if (!cls.relevant) filtered++;
  }

  return NextResponse.json({
    success: true,
    reclassified: emails.length,
    filtered,
    message: `${emails.length} emailuri reclasificate, ${filtered} filtrate ca nerelevante`,
  });
}
