import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Create a deadline (termen) manually for a case.
export async function POST(req: NextRequest) {
  try {
    const { caseId, descriere, data, tip } = await req.json();

    if (!caseId || !data) {
      return NextResponse.json({ error: 'caseId și data sunt obligatorii' }, { status: 400 });
    }

    const due = new Date(data);
    if (isNaN(due.getTime())) {
      return NextResponse.json({ error: 'Dată invalidă' }, { status: 400 });
    }

    const deadline = await prisma.deadline.create({
      data: {
        caseId,
        descriere: descriere?.trim() || null,
        data: due,
        tip: tip?.trim() || 'altul',
        status: 'activ',
      },
    });

    return NextResponse.json({ success: true, deadline });
  } catch (error) {
    console.error('Create deadline error:', error);
    return NextResponse.json({ error: 'Failed to create deadline' }, { status: 500 });
  }
}
