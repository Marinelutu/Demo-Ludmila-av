const BASE = 'https://api.telegram.org/bot';

function isConfigured(token: string | undefined): token is string {
  return !!token && token !== 'PLACEHOLDER';
}

export async function sendMessage(chatId: string, text: string, token?: string): Promise<boolean> {
  const t = token ?? process.env.TELEGRAM_BOT_NOTIF_TOKEN;
  if (!isConfigured(t) || !chatId || chatId === 'PLACEHOLDER') return false;
  try {
    const res = await fetch(`${BASE}${t}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendDocument(
  chatId: string,
  buffer: Buffer,
  filename: string,
  caption: string,
  token?: string
): Promise<boolean> {
  const t = token ?? process.env.TELEGRAM_BOT_NOTIF_TOKEN;
  if (!isConfigured(t) || !chatId || chatId === 'PLACEHOLDER') return false;
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('document', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), filename);
    const res = await fetch(`${BASE}${t}/sendDocument`, { method: 'POST', body: form });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getFileUrl(fileId: string, token: string): Promise<string | null> {
  if (!isConfigured(token)) return null;
  try {
    const res = await fetch(`${BASE}${token}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (!data.ok) return null;
    return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
  } catch {
    return null;
  }
}
