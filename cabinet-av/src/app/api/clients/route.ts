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

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'activ' },
      select: { id: true, nume: true, prenume: true, idnp: true, telefon: true, email: true, adresa: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('GET clients error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

const clientUpdateSchema = clientSchema.partial().extend({
  id: z.string().min(1),
  status: z.enum(['activ', 'arhivat']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json();
    const { id, ...rest } = clientUpdateSchema.parse(json);

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(rest.nume !== undefined && { nume: rest.nume }),
        ...(rest.prenume !== undefined && { prenume: rest.prenume }),
        ...(rest.idnp !== undefined && { idnp: rest.idnp || null }),
        ...(rest.telefon !== undefined && { telefon: rest.telefon || null }),
        ...(rest.email !== undefined && { email: rest.email || null }),
        ...(rest.adresa !== undefined && { adresa: rest.adresa || null }),
        ...(rest.note !== undefined && { note: rest.note || null }),
        ...(rest.status !== undefined && { status: rest.status }),
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Update client error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
