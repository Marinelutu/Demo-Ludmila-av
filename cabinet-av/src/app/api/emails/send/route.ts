import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, replyToEmailId } = await req.json();

    const email = process.env.GMAIL_EMAIL;
    const appPassword = process.env.GMAIL_APP_PASSWORD;

    if (!email || !appPassword) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_CONFIGURED', message: 'Configurați GMAIL_EMAIL și GMAIL_APP_PASSWORD în .env' },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: appPassword },
    });

    await transporter.sendMail({
      from: `Av. Ludmila Trofim <${email}>`,
      to,
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</div>`,
    });

    if (replyToEmailId) {
      await prisma.email.update({
        where: { id: replyToEmailId },
        data: { status: 'procesat' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Send failed', details: String(error) }, { status: 500 });
  }
}
