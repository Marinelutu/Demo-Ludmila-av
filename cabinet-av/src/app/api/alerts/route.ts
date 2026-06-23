import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/alerts — marchează o alertă legislativă ca citită
export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID alertă lipsă' }, { status: 400 });
    }

    const alert = await prisma.legislativeAlert.update({
      where: { id },
      data: { status: status || 'citita' },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
