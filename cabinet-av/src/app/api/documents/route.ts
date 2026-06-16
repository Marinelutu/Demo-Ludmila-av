import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { nume, tip, categorie, clientId, caseId, htmlContent, textContent } = await request.json();

    if (!nume || !tip) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă (nume, tip)' }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        nume,
        tip,
        categorie: categorie || 'generat',
        clientId: clientId || null,
        caseId: caseId || null,
        htmlContent: htmlContent || null,
        textContent: textContent || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, htmlContent, textContent } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID document lipsă' }, { status: 400 });
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(htmlContent !== undefined && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
