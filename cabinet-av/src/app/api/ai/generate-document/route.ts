import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Ești un asistent juridic specializat în dreptul Republicii Moldova. Generezi documente juridice profesionale în limba română, conform legislației moldovenești în vigoare.

Reguli stricte:
1. Folosești terminologia juridică corectă moldovenească
2. Citezi articolele exacte din codurile relevante
3. Documentele respectă structura formală a actelor juridice
4. Marchezi cu <span class="needs-confirmation" data-reason="MOTIV">TEXT</span> orice valoare care:
   - Lipsește din datele furnizate și ai presupus
   - Necesită verificare juridică (sumă, dată, articol incert)
   - Depinde de strategia avocatului (nu e tehnic exact)

Output: HTML curat editabil. Niciun comentariu sau explicație în afara HTML-ului. Nu pune tag-uri html/head/body.`;

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
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 4000,
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
