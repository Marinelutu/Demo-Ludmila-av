import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/telegram/send';

export async function POST(req: NextRequest) {
  try {
    const { chatId, message } = await req.json();
    const target = chatId || process.env.TELEGRAM_LAWYER_CHAT_ID || '';
    const sent = await sendMessage(target, message);
    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
