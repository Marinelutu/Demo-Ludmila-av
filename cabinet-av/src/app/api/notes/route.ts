import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

const noteSchema = z.object({
  clientId: z.string().min(1, 'Client lipsă'),
  continut: z.string().min(1, 'Conținutul notiței este obligatoriu'),
  confidential: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = noteSchema.parse(json);

    const note = await prisma.note.create({
      data: {
        clientId: body.clientId,
        continut: body.continut,
        confidential: body.confidential ?? false,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
