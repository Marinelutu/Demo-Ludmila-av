import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Listare documente, filtrabile după client/dosar. Folosit de dosar pentru a
// atașa documente existente ale clientului.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const clientId = sp.get('clientId');
    const caseId = sp.get('caseId');
    const excludeCaseId = sp.get('excludeCaseId');

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (caseId) where.caseId = caseId;
    // Documente care NU sunt deja în acest dosar — inclusiv cele fără dosar
    // (caseId null). În Prisma `not` nu cuprinde null-urile, deci folosim OR.
    if (excludeCaseId) where.OR = [{ caseId: null }, { caseId: { not: excludeCaseId } }];

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, nume: true, tip: true, categorie: true, caseId: true, createdAt: true },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nume, tip, categorie, clientId, caseId, htmlContent, textContent, ocrFields, originalImage } = await request.json();

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
        originalImage: originalImage || null,
        ocrFields: ocrFields || null,
        ocrStatus: ocrFields ? 'procesat' : null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID document lipsă' }, { status: 400 });
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, htmlContent, textContent, caseId, clientId } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID document lipsă' }, { status: 400 });
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(htmlContent !== undefined && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        // Atașare la dosar/client (caseId === null dezasociază)
        ...(caseId !== undefined && { caseId: caseId || null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
