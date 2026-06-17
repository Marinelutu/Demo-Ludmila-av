import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function loadOrCreate() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.appSettings.create({ data: { id: 1 } });
}

export async function GET() {
  const settings = await loadOrCreate();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    await loadOrCreate();

    const data: {
      hourlyRate?: number;
      numeCabinet?: string;
      codFiscal?: string;
      adresaSediu?: string;
    } = {};

    if (typeof body.hourlyRate === 'number' && body.hourlyRate >= 0) {
      data.hourlyRate = body.hourlyRate;
    }
    if (typeof body.numeCabinet === 'string') data.numeCabinet = body.numeCabinet;
    if (typeof body.codFiscal === 'string') data.codFiscal = body.codFiscal;
    if (typeof body.adresaSediu === 'string') data.adresaSediu = body.adresaSediu;

    const updated = await prisma.appSettings.update({ where: { id: 1 }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
