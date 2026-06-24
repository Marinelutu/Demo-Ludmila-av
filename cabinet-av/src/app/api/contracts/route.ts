import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

const contractSchema = z.object({
  clientId: z.string().min(1, 'Client lipsă'),
  tip: z.string().min(1, 'Tipul contractului este obligatoriu'),
  numar: z.string().optional().or(z.literal('')),
  data: z.string().optional().or(z.literal('')),
  onorariu: z.coerce.number().optional().nullable(),
});

const contractUpdateSchema = z.object({
  id: z.string().min(1),
  tip: z.string().optional(),
  numar: z.string().optional().or(z.literal('')),
  data: z.string().optional().or(z.literal('')),
  onorariu: z.coerce.number().optional().nullable(),
  status: z.enum(['activ', 'expirat', 'reziliat']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json();
    const body = contractUpdateSchema.parse(json);
    const { id, ...fields } = body;

    const updateData: Record<string, unknown> = {};
    if (fields.tip !== undefined) updateData.tip = fields.tip;
    if (fields.numar !== undefined) updateData.numar = fields.numar || null;
    if (fields.data !== undefined) updateData.data = fields.data ? new Date(fields.data) : null;
    if (fields.onorariu !== undefined) updateData.onorariu = fields.onorariu;
    if (fields.status !== undefined) updateData.status = fields.status;

    const contract = await prisma.contract.update({ where: { id }, data: updateData });
    return NextResponse.json(contract);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Update contract error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = contractSchema.parse(json);

    const contract = await prisma.contract.create({
      data: {
        clientId: body.clientId,
        tip: body.tip,
        numar: body.numar || null,
        data: body.data ? new Date(body.data) : new Date(),
        onorariu: body.onorariu ?? null,
        status: 'activ',
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Create contract error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
