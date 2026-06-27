import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

const consultationSchema = z.object({
  clientId: z.string().min(1, 'Client lipsă'),
  transcript: z.string().min(1, 'Transcript lipsă'),
  structuredData: z.unknown().optional().nullable(),
  durata: z.coerce.number().optional().nullable(),
});

// Descriere scurtă pentru intrarea de timp, dedusă din datele structurate.
function buildTimeDescriere(structuredData: unknown): string {
  if (structuredData && typeof structuredData === 'object') {
    const natura = (structuredData as { natura_cazului?: unknown }).natura_cazului;
    if (typeof natura === 'string' && natura.trim()) {
      return `Consultație — ${natura.trim()}`;
    }
  }
  return 'Consultație juridică';
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = consultationSchema.parse(json);

    const consultation = await prisma.consultation.create({
      data: {
        clientId: body.clientId,
        transcript: body.transcript,
        structuredData: body.structuredData ? JSON.stringify(body.structuredData) : null,
        durata: body.durata ?? null,
      },
    });

    // Înregistrăm automat timpul consultației ca intrare de timp, astfel încât
    // să apară în secțiunea "Timp" a clientului și în totalurile de ore.
    if (body.durata && body.durata > 0) {
      await prisma.timeEntry.create({
        data: {
          clientId: body.clientId,
          consultationId: consultation.id,
          categorie: 'consultatie',
          descriere: buildTimeDescriere(body.structuredData),
          startTime: consultation.createdAt,
          durata: body.durata,
          automatic: true,
        },
      });
    }

    return NextResponse.json(consultation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create consultation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID consultație lipsă' }, { status: 400 });
    }

    // Ștergem și intrările de timp asociate (legate prin consultationId), ca să
    // nu rămână timp orfan după ștergerea consultației.
    await prisma.timeEntry.deleteMany({ where: { consultationId: id } });
    await prisma.consultation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete consultation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
