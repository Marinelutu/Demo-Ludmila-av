import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: 'Document negăsit' }, { status: 404 });
  }

  if (!doc.filePath) {
    return NextResponse.json({ error: 'Fișierul original nu este disponibil' }, { status: 404 });
  }

  const absolutePath = path.isAbsolute(doc.filePath)
    ? doc.filePath
    : path.join(process.cwd(), doc.filePath);

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'Fișierul nu a fost găsit pe disc' }, { status: 404 });
  }

  const buffer = fs.readFileSync(absolutePath);
  const ext = path.extname(doc.nume).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.nume)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
