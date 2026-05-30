import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { photoDataUrl, name } = await req.json();

    if (!photoDataUrl || !photoDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 });
    }
    if (photoDataUrl.length > 8_000_000) {
      return NextResponse.json({ error: 'Foto muito grande' }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ imageDataUrl: photoDataUrl, usedFallback: true });
    }

    const prompt = `You are a professional sports photographer creating an official FIFA World Cup player portrait sticker.

CRITICAL TASK: Transform the person in the uploaded photo into a professional football portrait while PERFECTLY PRESERVING their identity.

IDENTITY PRESERVATION (non-negotiable):
- Keep EXACTLY the same face: same eyes, nose, mouth, jawline, cheekbones
- Keep EXACTLY the same skin tone
- Keep EXACTLY the same hair color, texture and style
- Keep EXACTLY the same age appearance
- Keep EXACTLY the same gender
- The person in the result MUST be instantly recognizable as the same individual

UNIFORM (mandatory):
- Official Brazil CBF national team jersey
- Yellow (canary yellow / amarelo canário) base color
- Green collar and sleeve trim
- CBF shield badge on left chest
- Green number 10 on the chest
- "BRASIL" text in green below the badge
- Nike swoosh logo in green on right chest

POSE AND FRAMING:
- Front-facing, looking directly into the camera
- Warm, confident smile
- Upper body portrait (visible from chest up)
- Centered in frame with slight head tilt for natural feel
- Professional sports portrait lighting (soft, even, studio-quality)

PHOTO QUALITY:
- Photorealistic — NOT illustrated, NOT cartoon, NOT 3D render, NOT painting
- High-resolution, sharp details
- Natural skin texture and lighting
- Professional FIFA/Panini sticker quality

BACKGROUND:
- Pure white (#FFFFFF) or fully transparent background
- No shadows behind the subject
- Clean, isolated portrait

OUTPUT MUST CONTAIN:
- ONLY the isolated player portrait
- NO text overlay
- NO numbers overlay
- NO logos except on the jersey itself
- NO frame or border
- NO watermark`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'tanstack-start-raw-fetch',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: photoDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`IA falhou (${res.status}): ${txt.slice(0, 300)}`);
      return NextResponse.json({ imageDataUrl: photoDataUrl, usedFallback: true });
    }

    const json: any = await res.json();
    const msg = json?.choices?.[0]?.message;
    const imgs: string[] = msg?.images?.map((i: any) => i?.image_url?.url).filter(Boolean) ?? [];
    const fromContent = Array.isArray(msg?.content)
      ? msg.content.map((p: any) => p?.image_url?.url).filter(Boolean)
      : [];
    const url = imgs[0] ?? fromContent[0];

    if (!url) {
      return NextResponse.json({ imageDataUrl: photoDataUrl, usedFallback: true });
    }

    return NextResponse.json({ imageDataUrl: url, usedFallback: false });
  } catch (e: any) {
    console.error('Erro generateJersey:', e);
    return NextResponse.json({ error: e?.message ?? 'Erro interno' }, { status: 500 });
  }
}
