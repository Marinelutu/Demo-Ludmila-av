import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');

  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], cases: [] });
  }

  try {
    const [clients, cases] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { nume: { contains: q } },
            { prenume: { contains: q } },
            { idnp: { contains: q } },
          ],
        },
        select: { id: true, nume: true, prenume: true },
        take: 5,
      }),
      prisma.case.findMany({
        where: {
          OR: [
            { denumire: { contains: q } },
            { numar: { contains: q } },
          ],
        },
        select: { id: true, numar: true, denumire: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ clients, cases });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
