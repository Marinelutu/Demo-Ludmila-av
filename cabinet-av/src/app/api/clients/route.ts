import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

const clientSchema = z.object({
  nume: z.string().min(2),
  prenume: z.string().min(2),
  idnp: z.string().regex(/^\d{13}$/).optional().or(z.literal('')),
  telefon: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  adresa: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = clientSchema.parse(json);

    const client = await prisma.client.create({
      data: {
        nume: body.nume,
        prenume: body.prenume,
        idnp: body.idnp || null,
        telefon: body.telefon || null,
        email: body.email || null,
        adresa: body.adresa || null,
        note: body.note || null,
        status: 'activ',
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create client error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
