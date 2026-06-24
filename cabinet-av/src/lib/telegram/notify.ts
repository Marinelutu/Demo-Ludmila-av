import { sendMessage } from './send';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function getRecipient(): { chatId: string; token: string | undefined } {
  return {
    chatId: process.env.TELEGRAM_LAWYER_CHAT_ID || '',
    token: process.env.TELEGRAM_BOT_NOTIF_TOKEN,
  };
}

export async function notifyEmailProcessed(args: {
  expeditor: string;
  subiect: string;
  rezumat: string | null;
  actiune: string | null;
  clientName?: string | null;
  urgent: boolean;
}): Promise<boolean> {
  const { chatId, token } = getRecipient();
  const lines = [
    `📧 <b>Email procesat${args.urgent ? ' ⚠️ URGENT' : ''}</b>`,
    `De la: ${escapeHtml(args.expeditor)}`,
    `Subiect: ${escapeHtml(args.subiect)}`,
  ];
  if (args.clientName) lines.push(`Client: ${escapeHtml(args.clientName)}`);
  if (args.rezumat) lines.push('', `<i>${escapeHtml(args.rezumat)}</i>`);
  if (args.actiune) lines.push('', `➡️ ${escapeHtml(args.actiune)}`);
  return sendMessage(chatId, lines.join('\n'), token);
}

export async function notifyDeadlines(
  items: Array<{ titlu: string; dataIso: string; zileRamase: number; dosarNumar: string }>
): Promise<boolean> {
  if (items.length === 0) return false;
  const { chatId, token } = getRecipient();
  const sorted = [...items].sort((a, b) => a.zileRamase - b.zileRamase);
  const lines = [`⏰ <b>${items.length} termen${items.length > 1 ? 'e' : ''} apropiat${items.length > 1 ? 'e' : ''}</b>`, ''];
  for (const it of sorted) {
    const urgency = it.zileRamase <= 1 ? '🔴' : it.zileRamase <= 3 ? '🟠' : '🟡';
    lines.push(
      `${urgency} <b>${escapeHtml(it.titlu)}</b>`,
      `Dosar ${escapeHtml(it.dosarNumar)} — în ${it.zileRamase} ${it.zileRamase === 1 ? 'zi' : 'zile'}`,
      ''
    );
  }
  return sendMessage(chatId, lines.join('\n').trimEnd(), token);
}

export async function notifyNewAlert(args: {
  titlu: string;
  descriere: string;
  actNormativ: string;
  dosareAfectate: number;
}): Promise<boolean> {
  const { chatId, token } = getRecipient();
  const lines = [
    '⚖️ <b>Alertă legislativă nouă</b>',
    `<b>${escapeHtml(args.titlu)}</b>`,
    `Act: ${escapeHtml(args.actNormativ)}`,
    '',
    escapeHtml(args.descriere),
  ];
  if (args.dosareAfectate > 0) {
    lines.push('', `📁 Afectează ${args.dosareAfectate} dosar${args.dosareAfectate > 1 ? 'e' : ''} activ${args.dosareAfectate > 1 ? 'e' : ''}.`);
  }
  return sendMessage(chatId, lines.join('\n'), token);
}
