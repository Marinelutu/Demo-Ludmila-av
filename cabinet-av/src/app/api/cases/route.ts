import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
