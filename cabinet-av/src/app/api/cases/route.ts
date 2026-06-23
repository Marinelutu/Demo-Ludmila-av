import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const cases = await prisma.case.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        stare: { in: ['deschis', 'in_curs'] },
      },
      select: { id: true, numar: true, denumire: true, tip: true, instanta: true, judecator: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error('GET cases error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const caseSchema = z.object({
  clientId: z.string().min(1, 'Client lipsă'),
  numar: z.string().min(1, 'Numărul dosarului este obligatoriu'),
  denumire: z.string().min(2, 'Denumirea este obligatorie'),
  tip: z.string().min(1, 'Tipul este obligatoriu'),
  instanta: z.string().optional().or(z.literal('')),
  judecator: z.string().optional().or(z.literal('')),
  descriere: z.string().optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = caseSchema.parse(json);

    const newCase = await prisma.case.create({
      data: {
        clientId: body.clientId,
        numar: body.numar,
        denumire: body.denumire,
        tip: body.tip,
        instanta: body.instanta || null,
        judecator: body.judecator || null,
        descriere: body.descriere || null,
        stare: 'deschis',
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create case error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
