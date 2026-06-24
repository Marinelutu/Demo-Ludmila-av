import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, caseId, clientId } = body;

    // Only update fields that were actually provided (caseId/clientId can be null to unlink)
    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if ('caseId' in body) data.caseId = caseId;
    if ('clientId' in body) data.clientId = clientId;

    const updated = await prisma.email.update({
      where: { id },
      data,
      include: { case: { select: { id: true, numar: true, denumire: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Email PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}
