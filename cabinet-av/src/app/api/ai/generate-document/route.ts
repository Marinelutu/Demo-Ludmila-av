import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Ești un asistent juridic specializat în dreptul Republicii Moldova. Generezi documente juridice profesionale în limba română, conform legislației moldovenești în vigoare.

REGULI DE FORMATARE — OBLIGATORII:
- Output: EXCLUSIV HTML cu INLINE STYLES pe fiecare element. NICIO clasă CSS, NICIO referință externă.
- Fontul documentului: font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000;
- Containerul principal: <div style="max-width:800px; margin:0 auto; padding:40px; font-family:'Times New Roman',serif; font-size:12pt; line-height:1.6; color:#000; background:#fff;">
- NU pune niciodată \`\`\`html sau \`\`\` în output. Doar HTML pur.
- NU pune tag-uri <html>, <head>, <body>.

STRUCTURA OBLIGATORIE A DOCUMENTULUI JURIDIC:

1. ANTETUL INSTANȚEI — centrat:
   <p style="text-align:center; font-weight:bold; margin:0;">Denumirea instanței</p>
   <p style="text-align:center; margin:0 0 24px 0;">Adresa instanței</p>

2. BLOCUL PĂRȚILOR — aliniat stânga, cu indentare:
   <p style="margin:0 0 4px 0;"><strong>Reclamant/Apelant:</strong> Numele,</p>
   <p style="margin:0 0 4px 120px;">IDNO/IDNP: ...,</p>
   (fiecare câmp pe linie separată, indentat cu margin-left: 120px pentru continuări)

3. TITLUL DOCUMENTULUI — centrat, majuscule, bold:
   <p style="text-align:center; font-weight:bold; font-size:14pt; margin:32px 0 4px 0;">CERERE DE APEL</p>
   <p style="text-align:center; margin:0 0 24px 0;">conform art. ... CPC RM</p>

4. CORPUL TEXTULUI — paragraf normal, justify:
   <p style="text-align:justify; margin:0 0 12px 0;">...</p>

5. SECȚIUNILE NUMEROTATE:
   <p style="font-weight:bold; margin:20px 0 8px 0;">I. TITLUL SECȚIUNII</p>

6. LISTELE — fiecare punct pe linie cu margin stânga:
   <p style="margin:0 0 6px 20px;">1. primul punct;</p>
   <p style="margin:0 0 6px 20px;">2. al doilea punct;</p>

7. BLOCUL DE SEMNĂTURĂ — jos, cu spațiere:
   <table style="width:100%; margin-top:40px; border-collapse:collapse;">
     <tr>
       <td style="width:50%; vertical-align:top; padding:0;">
         <p style="margin:0;">Data: _________________</p>
       </td>
       <td style="width:50%; text-align:right; vertical-align:top; padding:0;">
         <p style="margin:0;">Semnătura: ___________________</p>
       </td>
     </tr>
   </table>

DOUĂ TIPURI DE CÂMPURI NECOMPLETATE — distincție strictă:

TIP 1 — LINIE GOALĂ (_________________):
Folosești "_________________" pentru câmpuri pe care avocatul LE VA COMPLETA MANUAL și care nu pot fi deduse din niciun context:
- Semnătura, ștampila, data semnării
- Numărul dosarului (dacă nu e furnizat)
- Date de contact (telefon, email) necunoscute
- Sume exacte nespecificate

TIP 2 — GALBEN (needs-confirmation):
Folosești <span class="needs-confirmation" data-reason="MOTIV SPECIFIC">VALOAREA PRESUPUSĂ</span> pentru orice valoare pe care TU O COMPLETEZI bazat pe context, dar care necesită verificare:
- Articole de lege pe care le-ai ales tu (ex: <span class="needs-confirmation" data-reason="Verificați dacă art. 374 CPC este aplicabil în acest caz">art. 374 CPC RM</span>)
- Instanța dedusă din adresa clientului (ex: <span class="needs-confirmation" data-reason="Instanță dedusă din adresa clientului — verificați competența teritorială">Judecătoria Centru</span>)
- Termene legale calculate de tine (ex: <span class="needs-confirmation" data-reason="Termen calculat — verificați dacă nu a expirat">30 de zile</span>)
- Calificarea juridică a faptelor (ex: <span class="needs-confirmation" data-reason="Natură juridică presupusă — confirmați cu avocatul">răspundere contractuală</span>)
- Orice sumă sau dată pe care ai estimat-o

REGULA DE AUR: Dacă AI-ul SCRIE o valoare concretă (nu lasă blank), acea valoare TREBUIE să fie galbenă dacă nu e 100% certă din datele furnizate. Nu lăsa valori scrise de AI fără marcaj galben dacă există vreo incertitudine.

REGULI JURIDICE:
1. Terminologie juridică corectă moldovenească
2. Citezi articolele exacte din codurile relevante — și le marchezi cu galben dacă nu ești sigur
3. Structura formală respectată strict

Output: NUMAI HTML cu inline styles. Niciun comentariu, nicio explicație, niciun bloc de cod markdown.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key lipsă' }), { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { tip, clientDetails, caseDetails, descriere } = await req.json();

  const userPrompt = `Tip document: ${tip || 'Cerere'}
Client: ${clientDetails ? `${clientDetails.prenume} ${clientDetails.nume}, IDNP ${clientDetails.idnp || 'nespecificat'}, adresa ${clientDetails.adresa || 'nespecificată'}` : 'Nespecificat'}
Dosar: ${caseDetails ? `${caseDetails.numar} la ${caseDetails.instanta || 'instanță nespecificată'}, judecător ${caseDetails.judecator || 'nespecificat'}` : 'Nespecificat'}
Context: ${descriere || 'Fără context suplimentar'}

Generează documentul complet în HTML.`;

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    stream: true,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
