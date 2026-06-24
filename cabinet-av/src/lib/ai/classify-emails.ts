import Anthropic from '@anthropic-ai/sdk';

export type ClassifiableEmail = {
  expeditor: string;
  subiect: string;
  continut: string;
};

export type Classification = { relevant: boolean; categorie: string | null };

const SYSTEM_PROMPT = `Ești un filtru inteligent pentru inbox-ul unui cabinet de avocatură din Republica Moldova.
Pentru fiecare email decide dacă este RELEVANT pentru activitatea juridică a cabinetului.

RELEVANT (relevant: true) — orice are legătură cu munca de avocat:
- comunicări de la instanțe (hotărâri, încheieri, citații, somații)
- corespondență cu clienți despre dosare, contracte, procese
- executori judecătorești, notari, procuratură, poliție
- termene procesuale, acte juridice, expertize
- mesaje de pe justice.md sau alte platforme juridice
- avocați ai părții adverse, parteneri de cabinet

NERELEVANT (relevant: false) — nu are legătură cu activitatea juridică:
- marketing, reclame, promoții, oferte comerciale
- newslettere, abonamente, notificări de la rețele sociale
- notificări automate de securitate/cont (Google, Apple, etc.) fără context juridic
- cumpărături online, livrări, facturi pentru servicii personale
- mesaje personale fără legătură cu un dosar

Returnează DOAR un array JSON valid (fără markdown, fără explicații), câte un obiect per email:
[{"i": 0, "relevant": true, "categorie": "hotarare"}, {"i": 1, "relevant": false, "categorie": "marketing"}]

Valori posibile pentru "categorie": hotarare, citatie, instanta, client, contract, executor, notar, juridic, marketing, newsletter, social, notificare, personal, altele.`;

// Clasifică un lot de emailuri într-un singur apel AI (rapid + ieftin).
// La orice eroare sau lipsă de cheie API, emailul rămâne relevant
// (preferăm să nu pierdem corespondență juridică).
export async function classifyEmails(emails: ClassifiableEmail[]): Promise<Classification[]> {
  if (emails.length === 0) return [];
  if (!process.env.ANTHROPIC_API_KEY) {
    return emails.map(() => ({ relevant: true, categorie: null }));
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const list = emails
      .map(
        (e, i) =>
          `[${i}]\nDe la: ${e.expeditor}\nSubiect: ${e.subiect}\nText: ${(e.continut || '').replace(/\s+/g, ' ').slice(0, 400)}`
      )
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: list }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : raw) as Array<{
      i: number;
      relevant?: boolean;
      categorie?: string;
    }>;

    const byIndex = new Map(parsed.map((p) => [p.i, p]));
    return emails.map((_, i) => {
      const p = byIndex.get(i);
      return {
        relevant: p ? p.relevant !== false : true,
        categorie: p?.categorie ?? null,
      };
    });
  } catch (err) {
    console.error('[classify] failed, defaulting to relevant:', err);
    return emails.map(() => ({ relevant: true, categorie: null }));
  }
}
