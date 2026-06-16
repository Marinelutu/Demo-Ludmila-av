import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, documentType, caseDetails, clientDetails } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `Ești un avocat expert din Republica Moldova care redactează documente juridice.
Trebuie să generezi un document HTML curat care va fi introdus direct într-un editor Tiptap (WYSIWYG).
Folosește tag-uri HTML standard (h1, h2, p, ul, li, strong). Nu folosi markdown, doar HTML.
Nu pune tag-uri <html>, <head> sau <body>, doar conținutul interior.

Context:
Tip Document: ${documentType || 'Cerere'}
Client: ${clientDetails ? JSON.stringify(clientDetails) : 'Nespecificat'}
Dosar: ${caseDetails ? JSON.stringify(caseDetails) : 'Nespecificat'}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ html: textContent });
  } catch (error) {
    console.error('Generate Doc API Error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
