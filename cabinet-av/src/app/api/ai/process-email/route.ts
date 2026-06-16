import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { emailId } = await req.json();

    if (!emailId) {
      return NextResponse.json({ error: 'No email ID provided' }, { status: 400 });
    }

    const email = await prisma.email.findUnique({
      where: { id: emailId }
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `Ești un asistent juridic inteligent. 
Analizează emailul primit de la un client sau o instanță/instituție și extrage următoarele informații în format JSON strict:
{
  "summary": "Rezumat scurt de maxim 2-3 propoziții.",
  "actionRequired": "Acțiunea sugerată pentru avocat (ex: 'De răspuns până la data X', 'De salvat în dosarul Y'). Poate fi null dacă nu este necesară o acțiune.",
  "urgency": "high" | "medium" | "low",
  "dates": ["orice date calendaristice găsite, format DD/MM/YYYY"]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Subiect: ${email.subiect}\n\nConținut:\n${email.continut}` }],
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    
    // Extract JSON from potential markdown blocks
    const jsonMatch = textContent.match(/```json\n([\s\S]*)\n```/) || textContent.match(/```\n([\s\S]*)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : textContent;
    
    const analysis = JSON.parse(jsonString);

    // Update email in database
    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        aiSummary: analysis.summary,
        aiAction: analysis.actionRequired,
      }
    });

    return NextResponse.json(updatedEmail);
  } catch (error) {
    console.error('Email Processing API Error:', error);
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
  }
}
