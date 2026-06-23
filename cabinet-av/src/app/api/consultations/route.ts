import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

const consultationSchema = z.object({
  clientId: z.string().min(1, 'Client lipsă'),
  transcript: z.string().min(1, 'Transcript lipsă'),
  structuredData: z.unknown().optional().nullable(),
  durata: z.coerce.number().optional().nullable(),
});

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

    return NextResponse.json(consultation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create consultation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
